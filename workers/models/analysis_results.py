"""Combined analysis results model"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from .risk_models import RisksAnalysis
from .accessibility_models import AccessibilityAnalysis
from .question_models import QuestionsAnalysis
from .subcontracting_models import SubcontractingAnalysis


class TokenUsage(BaseModel):
    """Token usage for a single LLM call"""
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float


class CategoryCost(BaseModel):
    """Cost breakdown for each analysis category"""
    risks: Optional[TokenUsage] = None
    accessibility: Optional[TokenUsage] = None
    questions: Optional[TokenUsage] = None
    subcontracting: Optional[TokenUsage] = None


class AnalysisResults(BaseModel):
    """Complete RFP analysis results from all 4 categories"""
    # Analysis results
    risks: Optional[RisksAnalysis] = None
    accessibility: Optional[AccessibilityAnalysis] = None
    questions: Optional[QuestionsAnalysis] = None
    subcontracting: Optional[SubcontractingAnalysis] = None

    # Metadata
    document_id: str
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
    processing_time_seconds: float

    # Cost tracking
    cost_breakdown: CategoryCost
    total_cost_usd: float
    total_tokens: int

    # Error tracking
    errors: list[str] = Field(default_factory=list)
    partial_results: bool = False

    def has_errors(self) -> bool:
        """Check if any errors occurred during analysis"""
        return len(self.errors) > 0

    def get_failed_categories(self) -> list[str]:
        """Get list of categories that failed"""
        failed = []
        if self.risks is None:
            failed.append("risks")
        if self.accessibility is None:
            failed.append("accessibility")
        if self.questions is None:
            failed.append("questions")
        if self.subcontracting is None:
            failed.append("subcontracting")
        return failed

    def get_success_rate(self) -> float:
        """Calculate percentage of successful categories"""
        total = 4
        failed = len(self.get_failed_categories())
        return ((total - failed) / total) * 100