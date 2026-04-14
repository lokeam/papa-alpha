"""LLM Service for RFP analysis

Orchestrates all 4 analysis categories with:
- Async parallel execution (3 categories)
- Sequential execution (questions depends on risks)
- Exponential backoff retry (max 5 attempts)
- Token tracking and cost calculation
- Pydantic validation of responses
- Error handling: any category failure is fatal (raises AnalysisFailedError)
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional
from datetime import datetime

from openai import AsyncOpenAI

from exceptions import AnalysisFailedError
from config import (
    OPENAI_API_KEY,
    LLM_MODEL,
    LLM_PRICING,
    MAX_RETRIES,
    RETRY_BASE_DELAY,
    RETRY_MAX_DELAY,
    LLM_TIMEOUT,
    RISKS_CONTEXT_LIMIT,
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

        # Phase 1: Run 3 analyses in parallel
        logger.info("Phase 1: Running parallel analyses (risks, accessibility, subcontracting)")
        if progress_publisher:
            await progress_publisher.publish("analyzing_risks")

        try:
            risks_result, accessibility_result, subcontracting_result = (
                await asyncio.gather(
                    self._analyze_risks(full_text, metadata),
                    self._analyze_accessibility(full_text, metadata),
                    self._analyze_subcontracting(full_text, metadata),
                )
            )
        except Exception as e:
            # Determine which category failed from the exception context.
            # With gather (no return_exceptions), the first exception propagates.
            category = getattr(e, "_analysis_category", "unknown")
            raise AnalysisFailedError(category, e) from e

        # Phase 2: Run questions (depends on risks)
        logger.info("Phase 2: Running sequential analysis (questions)")
        if progress_publisher:
            await progress_publisher.publish("analyzing_questions")

        risks_context = [r.model_dump() for r in risks_result.risks[:RISKS_CONTEXT_LIMIT]]

        try:
            questions_result = await self._analyze_questions(
                full_text,
                metadata,
                risks_context
            )
        except Exception as e:
            raise AnalysisFailedError("questions", e) from e

        # Calculate totals
        processing_time = time.time() - start_time
        total_cost = self._calculate_total_cost()

        # Build results — all four categories succeeded if we reach here
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
        )

        logger.info(
            f"Analysis complete: {processing_time:.2f}s, "
            f"${total_cost:.4f}"
        )

        return analysis_results

    async def _analyze_risks(
        self,
        full_text: str,
        metadata: Dict[str, Any]
    ) -> RisksAnalysis:
        """Analyze RFP for risks (Category 1)"""
        logger.info("Analyzing risks...")

        section_text = self.extractor.extract_for_risks(full_text)
        user_prompt = build_risks_prompt(section_text, metadata)

        try:
            response = await self._call_llm_with_retry(
                system_prompt=RISKS_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                category="risks"
            )

            result_json = json.loads(response['content'])
            validated = RisksAnalysis(**result_json)

            self.category_costs.risks = TokenUsage(**response['usage'])

            logger.info(f"Risks analysis complete: {validated.analysis_summary.total_risks_found} risks found")
            return validated

        except Exception as e:
            e._analysis_category = "risks"
            raise

    async def _analyze_accessibility(
        self,
        full_text: str,
        metadata: Dict[str, Any]
    ) -> AccessibilityAnalysis:
        """Analyze RFP for accessibility barriers (Category 2)"""
        logger.info("Analyzing accessibility...")

        section_text = self.extractor.extract_for_accessibility(full_text)
        user_prompt = build_accessibility_prompt(section_text, metadata)

        try:
            response = await self._call_llm_with_retry(
                system_prompt=ACCESSIBILITY_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                category="accessibility"
            )

            result_json = json.loads(response['content'])
            validated = AccessibilityAnalysis(**result_json)

            self.category_costs.accessibility = TokenUsage(**response['usage'])

            logger.info(
                f"Accessibility analysis complete: "
                f"score {validated.accessibility_analysis.final_score}/10, "
                f"{validated.accessibility_analysis.barriers_found} barriers"
            )
            return validated

        except Exception as e:
            e._analysis_category = "accessibility"
            raise

    async def _analyze_questions(
        self,
        full_text: str,
        metadata: Dict[str, Any],
        risks_context: Optional[List[Dict[str, Any]]] = None
    ) -> QuestionsAnalysis:
        """Predict vendor questions (Category 3)"""
        logger.info("Analyzing questions...")

        section_text = self.extractor.extract_for_risks(full_text)
        user_prompt = build_questions_prompt(section_text, metadata, risks_context)

        response = await self._call_llm_with_retry(
            system_prompt=QUESTIONS_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            category="questions"
        )

        result_json = json.loads(response['content'])
        validated = QuestionsAnalysis(**result_json)

        self.category_costs.questions = TokenUsage(**response['usage'])

        logger.info(
            f"Questions analysis complete: "
            f"{validated.questions_predicted} questions, "
            f"{validated.urgency_breakdown.high} high urgency"
        )
        return validated

    async def _analyze_subcontracting(
        self,
        full_text: str,
        metadata: Dict[str, Any]
    ) -> SubcontractingAnalysis:
        """Identify subcontracting opportunities (Category 4)"""
        logger.info("Analyzing subcontracting...")

        section_text = self.extractor.extract_for_subcontracting(full_text)
        user_prompt = build_subcontracting_prompt(section_text, metadata)

        try:
            response = await self._call_llm_with_retry(
                system_prompt=SUBCONTRACTING_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                category="subcontracting"
            )

            result_json = json.loads(response['content'])
            validated = SubcontractingAnalysis(**result_json)

            self.category_costs.subcontracting = TokenUsage(**response['usage'])

            logger.info(
                f"Subcontracting analysis complete: "
                f"{validated.subcontracting_analysis.opportunities_found} opportunities"
            )
            return validated

        except Exception as e:
            e._analysis_category = "subcontracting"
            raise

    async def _call_llm_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        category: str
    ) -> Dict[str, Any]:
        """Call OpenAI API with exponential backoff retry.

        Returns:
            Dict with 'content' and 'usage'.

        Raises:
            The underlying exception from the final retry attempt.
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