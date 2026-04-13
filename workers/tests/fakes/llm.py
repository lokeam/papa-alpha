"""Fake LLMService — spy with configurable behavior."""

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from models import AnalysisResults, CategoryCost, TokenUsage


def _stub_token_usage() -> TokenUsage:
    return TokenUsage(
        input_tokens=100,
        output_tokens=50,
        total_tokens=150,
        estimated_cost_usd=0.0001,
    )


class FakeLLMService:
    """LLM fake with a configurable behavior knob.

    Behaviors:
        "success" — return a canned AnalysisResults with all four categories.
        "raise"   — raise the exception stored in self.error.
        "slow"    — wait for self.delay seconds, then return canned results.
                     Respects cancellation.
    """

    def __init__(
        self,
        behavior: str = "success",
        error: Optional[Exception] = None,
        delay: float = 0,
    ):
        self.behavior = behavior
        self.error = error
        self.delay = delay
        self.call_count = 0
        self.calls: List[Dict[str, Any]] = []
        # Set by the "slow" behavior so tests can detect when work has started.
        self.started = asyncio.Event()

    async def analyze_rfp(
        self,
        document_id: str,
        full_text: str,
        progress_publisher=None,
    ) -> AnalysisResults:
        self.call_count += 1
        self.calls.append({
            "document_id": document_id,
            "full_text_len": len(full_text),
        })

        if self.behavior == "raise":
            assert self.error is not None, "Set FakeLLMService.error before using 'raise' behavior"
            raise self.error

        if self.behavior == "slow":
            self.started.set()
            await asyncio.sleep(self.delay)

        return _build_canned_results(document_id)


def _build_canned_results(document_id: str) -> AnalysisResults:
    """Minimal valid AnalysisResults with all four categories populated."""
    from models.risk_models import (
        Risk, RiskType, RiskSeverity, RiskLocation,
        AnalysisSummary, SelfCritique, SectionAnalyzed, RisksAnalysis,
    )
    from models.accessibility_models import (
        AccessibilityBarrier, BarrierType, BarrierSeverity,
        AccessibilityScore, BarrierLocation, RequirementAnalysis,
        AccessibilitySelfCritique, AccessibilityAnalysis,
    )
    from models.question_models import (
        PredictedQuestion, QuestionUrgency, UrgencyBreakdown,
        QuestionTriggeredBy, ConfusionAnalysis, QuestionsSelfCritique,
        QuestionsAnalysis,
    )
    from models.subcontracting_models import (
        SubcontractingOpportunity, SubcontractingAnalysisSummary,
        SubcontractingSelfCritique, SubcontractingAnalysis,
    )

    risks = RisksAnalysis(
        section_analyzed=SectionAnalyzed(name="Evaluation Criteria", page_range="1-5"),
        analysis_summary=AnalysisSummary(
            total_risks_found=1,
            high_severity=1,
            medium_severity=0,
            low_severity=0,
            overall_risk_level="HIGH",
        ),
        risks=[
            Risk(
                id="RISK-001",
                type=RiskType.COMPLIANCE,
                severity=RiskSeverity.HIGH,
                location=RiskLocation(section="1.1", page="1"),
                exact_quote="The contractor shall comply with all applicable regulations",
                issue_description="Vague compliance requirement without specific regulations listed",
                reasoning="This requirement is too broad and could be interpreted differently by "
                          "different vendors, leading to inconsistent proposals and potential compliance gaps",
                impact_if_unresolved="Vendors may miss critical compliance requirements",
                suggested_fix="List specific regulations and standards that apply to this contract",
                confidence=85,
            )
        ],
        self_critique=SelfCritique(
            review_performed=True,
            findings_validated=True,
        ),
    )

    accessibility = AccessibilityAnalysis(
        accessibility_analysis=AccessibilityScore(
            final_score=7.0,
            rating="Good",
            total_deductions=3.0,
            barriers_found=1,
        ),
        barriers=[
            AccessibilityBarrier(
                id="ACCESS-001",
                type=BarrierType.BONDING,
                severity=BarrierSeverity.MEDIUM,
                location=BarrierLocation(section="2.1", page="3"),
                exact_quote="Contractor must maintain a performance bond of $500,000",
                requirement_analysis=RequirementAnalysis(
                    what_is_required="$500,000 performance bond",
                    industry_standard="$100,000 - $250,000 for similar contracts",
                    comparison="2-5x higher than industry standard",
                    is_justified=False,
                    justification_reasoning="Bond amount is disproportionate to contract value",
                ),
                impact="Small businesses may not qualify for bonds of this size",
                deduction=1.5,
                suggestion="Consider reducing bond to $250,000 or allowing incremental bonding",
                confidence=80,
            )
        ],
        self_critique=AccessibilitySelfCritique(
            standards_applied_correctly=True,
            deductions_calculated_accurately=True,
        ),
    )

    questions = QuestionsAnalysis(
        section_analyzed="Evaluation Criteria",
        questions_predicted=1,
        urgency_breakdown=UrgencyBreakdown(high=1, medium=0, low=0),
        timeline_impact="HIGH",
        questions=[
            PredictedQuestion(
                id="Q-001",
                urgency=QuestionUrgency.HIGH,
                priority=1,
                predicted_question="What specific compliance regulations are applicable to this contract?",
                triggered_by=QuestionTriggeredBy(
                    exact_quote="The contractor shall comply with all applicable regulations",
                    location="Section 1.1, Page 1",
                ),
                confusion_analysis=ConfusionAnalysis(
                    why_confusing="The term 'all applicable regulations' is extremely broad and does not "
                                  "specify which federal, state, or local regulations apply to this contract",
                    possible_interpretations=[
                        "Only federal procurement regulations apply",
                        "All federal, state, and local regulations apply",
                    ],
                    vendor_cannot_determine="Which specific regulatory frameworks must be addressed in the proposal",
                ),
                urgency_justification="Without knowing specific regulations, vendors cannot accurately scope compliance efforts or costs",
                impact_if_unresolved="Proposals will vary wildly in compliance coverage, making evaluation unfair",
                recommendation="FIX NOW",
                suggested_fix="Replace with enumerated list of specific applicable regulations and standards",
                confidence=90,
            )
        ],
        self_critique=QuestionsSelfCritique(
            questions_are_realistic=True,
            urgency_levels_justified=True,
        ),
    )

    subcontracting = SubcontractingAnalysis(
        subcontracting_analysis=SubcontractingAnalysisSummary(
            rfp_requirement="encouraged",
            goals_specified=False,
            opportunities_found=1,
            total_estimated_value="$50,000 - $100,000",
        ),
        opportunities=[
            SubcontractingOpportunity(
                id="SUB-001",
                area="IT Support Services",
                rfp_text="The contractor shall provide comprehensive IT support including help desk operations",
                location="Section 3.2, Page 5",
                estimated_percentage="10-20%",
                estimated_value="$50,000 - $100,000",
                characteristics=["Help desk operations", "Tier 1 support"],
                suitable_business_types=["8(a)", "HUBZone"],
                naics_code="541512",
                naics_description="Computer Systems Design Services",
                reasoning="Help desk operations are a well-defined, separable scope item that small "
                          "businesses commonly provide, making this a natural subcontracting opportunity",
                confidence=85,
            )
        ],
        self_critique=SubcontractingSelfCritique(
            opportunities_are_realistic=True,
            estimates_are_justified=True,
        ),
    )

    usage = _stub_token_usage()
    cost = CategoryCost(
        risks=usage,
        accessibility=usage,
        questions=usage,
        subcontracting=usage,
    )

    return AnalysisResults(
        document_id=document_id,
        analyzed_at=datetime.utcnow(),
        processing_time_seconds=1.0,
        risks=risks,
        accessibility=accessibility,
        questions=questions,
        subcontracting=subcontracting,
        cost_breakdown=cost,
        total_cost_usd=0.0004,
        total_tokens=600,
    )
