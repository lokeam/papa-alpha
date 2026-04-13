"""LLM Service for RFP analysis

Orchestrates all 4 analysis categories with:
- Async parallel execution (3 categories)
- Sequential execution (questions depends on risks)
- Exponential backoff retry (max 5 attempts)
- Token tracking and cost calculation
- Pydantic validation of responses
- Error handling with partial results
"""

import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime

from openai import AsyncOpenAI
from pydantic import ValidationError

from config import (
    OPENAI_API_KEY,
    LLM_MODEL,
    MAX_RETRIES,
    RETRY_BASE_DELAY,
    RETRY_MAX_DELAY,
    LLM_TIMEOUT,
)
from models import (
    RisksAnalysis,
    AccessibilityAnalysis,
    QuestionsAnalysis,
    SubcontractingAnalysis,
    AnalysisResults,
    TokenUsage,
    CategoryCost,
)
from prompts import (
    RISKS_SYSTEM_PROMPT,
    ACCESSIBILITY_SYSTEM_PROMPT,
    QUESTIONS_SYSTEM_PROMPT,
    SUBCONTRACTING_SYSTEM_PROMPT,
    build_risks_prompt,
    build_accessibility_prompt,
    build_questions_prompt,
    build_subcontracting_prompt,
)
from utils.section_extractor import SectionExtractor

logger = logging.getLogger(__name__)


class LLMService:
    """Orchestrates all LLM analysis calls with retry logic and error handling"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize LLM service

        Accepts:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY from config)
        """
        self.api_key = api_key or OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")

        self.client = AsyncOpenAI(api_key=self.api_key, timeout=LLM_TIMEOUT)
        self.extractor = SectionExtractor()
        self.model = LLM_MODEL

        # Track costs
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.category_costs = CategoryCost()

    async def analyze_rfp(
        self,
        document_id: str,
        full_text: str,
        progress_publisher=None,
    ) -> AnalysisResults:
        """Run complete RFP analysis (all 4 categories)

        Accepts:
            document_id: Document UUID
            full_text: Complete extracted RFP text
            progress_publisher: Optional ProgressPublisher for real-time updates

        Returns:
            AnalysisResults with all category results and cost tracking
        """
        start_time = time.time()
        logger.info(f"Starting RFP analysis for document {document_id}")

        # Extract metadata
        metadata = self.extractor.extract_metadata(full_text)
        logger.info(f"Extracted metadata: {metadata}")

        errors = []

        # Phase 1: Run 3 analyses in parallel
        logger.info("Phase 1: Running parallel analyses (risks, accessibility, subcontracting)")
        # Publish progress before starting
        if progress_publisher:
            await progress_publisher.publish("analyzing_risks")

        results = await asyncio.gather(
            self._analyze_risks(full_text, metadata),
            self._analyze_accessibility(full_text, metadata),
            self._analyze_subcontracting(full_text, metadata),
            return_exceptions=True
        )

        risks_result, accessibility_result, subcontracting_result = results

        # Check for errors in parallel execution
        if isinstance(risks_result, Exception):
            logger.error(f"Risks analysis failed: {risks_result}")
            errors.append(f"Risks: {str(risks_result)}")
            risks_result = None

        if isinstance(accessibility_result, Exception):
            logger.error(f"Accessibility analysis failed: {accessibility_result}")
            errors.append(f"Accessibility: {str(accessibility_result)}")
            accessibility_result = None

        if isinstance(subcontracting_result, Exception):
            logger.error(f"Subcontracting analysis failed: {subcontracting_result}")
            errors.append(f"Subcontracting: {str(subcontracting_result)}")
            subcontracting_result = None

        # Phase 2: Run questions (depends on risks)
        logger.info("Phase 2: Running sequential analysis (questions)")
        # Publish progress before questions
        if progress_publisher:
            await progress_publisher.publish("analyzing_questions")

        questions_result = None
        try:
            # Pass risks as context if available
            risks_context = None
            if isinstance(risks_result, RisksAnalysis):
                risks_context = [r.dict() for r in risks_result.risks[:5]]

            questions_result = await self._analyze_questions(
                full_text,
                metadata,
                risks_context
            )
        except Exception as e:
            logger.error(f"Questions analysis failed: {e}")
            errors.append(f"Questions: {str(e)}")

        # Calculate totals
        processing_time = time.time() - start_time
        total_cost = self._calculate_total_cost()

        # Build results
        analysis_results = AnalysisResults(
            document_id=document_id,
            analyzed_at=datetime.utcnow(),
            processing_time_seconds=round(processing_time, 2),
            risks=risks_result,
            accessibility=accessibility_result,
            questions=questions_result,
            subcontracting=subcontracting_result,
            cost_breakdown=self.category_costs,
            total_cost_usd=total_cost,
            total_tokens=self.total_input_tokens + self.total_output_tokens,
            errors=errors,
            partial_results=len(errors) > 0
        )

        logger.info(
            f"Analysis complete: {processing_time:.2f}s, "
            f"${total_cost:.4f}, "
            f"{analysis_results.get_success_rate():.0f}% success rate"
        )

        return analysis_results

    async def _analyze_risks(
        self,
        full_text: str,
        metadata: Dict[str, Any]
    ) -> Optional[RisksAnalysis]:
        """Analyze RFP for risks (Category 1)"""
        logger.info("Analyzing risks...")

        # Extract relevant sections
        section_text = self.extractor.extract_for_risks(full_text)

        # Build prompt
        user_prompt = build_risks_prompt(section_text, metadata)

        # Call LLM with retry
        response = await self._call_llm_with_retry(
            system_prompt=RISKS_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            category="risks"
        )

        if not response:
            return None

        # Parse and validate
        try:
            result_json = json.loads(response['content'])
            validated = RisksAnalysis(**result_json)

            # Track cost
            self.category_costs.risks = TokenUsage(**response['usage'])

            logger.info(f"✓ Risks analysis complete: {validated.analysis_summary.total_risks_found} risks found")
            return validated

        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Failed to parse risks response: {e}")
            raise

    async def _analyze_accessibility(
        self,
        full_text: str,
        metadata: Dict[str, Any]
    ) -> Optional[AccessibilityAnalysis]:
        """Analyze RFP for accessibility barriers (Category 2)"""
        logger.info("Analyzing accessibility...")

        # Extract relevant sections
        section_text = self.extractor.extract_for_accessibility(full_text)

        # Build prompt
        user_prompt = build_accessibility_prompt(section_text, metadata)

        # Call LLM with retry
        response = await self._call_llm_with_retry(
            system_prompt=ACCESSIBILITY_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            category="accessibility"
        )

        if not response:
            return None

        # Parse and validate
        try:
            result_json = json.loads(response['content'])
            validated = AccessibilityAnalysis(**result_json)

            # Track cost
            self.category_costs.accessibility = TokenUsage(**response['usage'])

            logger.info(
                f"✓ Accessibility analysis complete: "
                f"score {validated.accessibility_analysis.final_score}/10, "
                f"{validated.accessibility_analysis.barriers_found} barriers"
            )
            return validated

        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Failed to parse accessibility response: {e}")
            raise

    async def _analyze_questions(
        self,
        full_text: str,
        metadata: Dict[str, Any],
        risks_context: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[QuestionsAnalysis]:
        """Predict vendor questions (Category 3)"""
        logger.info("Analyzing questions...")

        # Use same sections as risks
        section_text = self.extractor.extract_for_risks(full_text)

        # Build prompt with risks context
        user_prompt = build_questions_prompt(section_text, metadata, risks_context)

        # Call LLM with retry
        response = await self._call_llm_with_retry(
            system_prompt=QUESTIONS_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            category="questions"
        )

        if not response:
            return None

        # Parse and validate
        try:
            result_json = json.loads(response['content'])
            validated = QuestionsAnalysis(**result_json)

            # Track cost
            self.category_costs.questions = TokenUsage(**response['usage'])

            logger.info(
                f"✓ Questions analysis complete: "
                f"{validated.questions_predicted} questions, "
                f"{validated.urgency_breakdown.high} high urgency"
            )
            return validated

        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Failed to parse questions response: {e}")
            raise

    async def _analyze_subcontracting(
        self,
        full_text: str,
        metadata: Dict[str, Any]
    ) -> Optional[SubcontractingAnalysis]:
        """Identify subcontracting opportunities (Category 4)"""
        logger.info("Analyzing subcontracting...")

        # Extract relevant sections
        section_text = self.extractor.extract_for_subcontracting(full_text)

        # Build prompt
        user_prompt = build_subcontracting_prompt(section_text, metadata)

        # Call LLM with retry
        response = await self._call_llm_with_retry(
            system_prompt=SUBCONTRACTING_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            category="subcontracting"
        )

        if not response:
            return None

        # Parse and validate
        try:
            result_json = json.loads(response['content'])
            validated = SubcontractingAnalysis(**result_json)

            # Track cost
            self.category_costs.subcontracting = TokenUsage(**response['usage'])

            logger.info(
                f"✓ Subcontracting analysis complete: "
                f"{validated.subcontracting_analysis.opportunities_found} opportunities"
            )
            return validated

        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Failed to parse subcontracting response: {e}")
            raise

    async def _call_llm_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        category: str
    ) -> Optional[Dict[str, Any]]:
        """Call OpenAI API with exponential backoff retry

        Accepts:
            system_prompt: System prompt
            user_prompt: User prompt
            category: Category name for logging

        Returns:
            Dict with 'content' and 'usage' or None if all retries failed
        """
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.debug(f"[{category}] Attempt {attempt}/{MAX_RETRIES}")

                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,  # Low temperature for consistency
                )

                # Extract response
                content = response.choices[0].message.content
                usage = response.usage

                # Track tokens
                self.total_input_tokens += usage.prompt_tokens
                self.total_output_tokens += usage.completion_tokens

                # Calculate cost
                from config import LLM_PRICING
                pricing = LLM_PRICING[self.model]
                input_cost = usage.prompt_tokens * pricing['input']
                output_cost = usage.completion_tokens * pricing['output']
                total_cost = input_cost + output_cost

                logger.info(
                    f"[{category}] Success: "
                    f"{usage.prompt_tokens} in + {usage.completion_tokens} out = "
                    f"${total_cost:.4f}"
                )

                return {
                    'content': content,
                    'usage': {
                        'input_tokens': usage.prompt_tokens,
                        'output_tokens': usage.completion_tokens,
                        'total_tokens': usage.total_tokens,
                        'estimated_cost_usd': round(total_cost, 6)
                    }
                }

            except Exception as e:
                logger.warning(f"[{category}] Attempt {attempt} failed: {e}")

                if attempt == MAX_RETRIES:
                    logger.error(f"[{category}] All {MAX_RETRIES} attempts failed")
                    raise

                # Exponential backoff: 1s, 2s, 4s, 8s, 16s
                delay = min(RETRY_BASE_DELAY * (2 ** (attempt - 1)), RETRY_MAX_DELAY)
                logger.info(f"[{category}] Retrying in {delay}s...")
                await asyncio.sleep(delay)

        return None

    def _calculate_total_cost(self) -> float:
        """Calculate total cost across all categories"""
        total = 0.0

        if self.category_costs.risks:
            total += self.category_costs.risks.estimated_cost_usd
        if self.category_costs.accessibility:
            total += self.category_costs.accessibility.estimated_cost_usd
        if self.category_costs.questions:
            total += self.category_costs.questions.estimated_cost_usd
        if self.category_costs.subcontracting:
            total += self.category_costs.subcontracting.estimated_cost_usd

        return round(total, 6)