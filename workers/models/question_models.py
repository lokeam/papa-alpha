"""Pydantic models for Category 3: Clarifying Questions"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional
from enum import Enum


class QuestionUrgency(str, Enum):
    """Urgency levels for predicted questions"""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class QuestionTriggeredBy(BaseModel):
    """Information about what triggered the question"""
    exact_quote: str = Field(min_length=10)
    location: str


class ConfusionAnalysis(BaseModel):
    """Analysis of why vendors will be confused"""
    why_confusing: str = Field(min_length=50)
    possible_interpretations: List[str] = Field(min_items=2)
    vendor_cannot_determine: str = Field(min_length=20)


class PredictedQuestion(BaseModel):
    """Individual predicted vendor question"""
    id: str = Field(pattern=r"^Q-\d{3}$")
    urgency: QuestionUrgency
    priority: int = Field(ge=1)
    predicted_question: str = Field(min_length=20)
    triggered_by: QuestionTriggeredBy
    confusion_analysis: ConfusionAnalysis
    urgency_justification: str = Field(min_length=30)
    impact_if_unresolved: str = Field(min_length=30)
    recommendation: Literal["FIX NOW", "CLARIFY IN Q&A"]
    suggested_fix: str = Field(min_length=20)
    confidence: int = Field(ge=0, le=100)

    @field_validator('confidence')
    @classmethod
    def flag_low_confidence(cls, v: int) -> int:
        """Flag findings with confidence below 70%"""
        if v < 70:
            pass
        return v


class UrgencyBreakdown(BaseModel):
    """Count of questions by urgency level"""
    high: int = Field(ge=0)
    medium: int = Field(ge=0)
    low: int = Field(ge=0)


class QuestionsSelfCritique(BaseModel):
    """Self-review for questions analysis"""
    questions_are_realistic: bool
    urgency_levels_justified: bool
    concerns: Optional[str] = None


class QuestionsAnalysis(BaseModel):
    """Complete clarifying questions analysis"""
    section_analyzed: str
    questions_predicted: int = Field(ge=0)
    urgency_breakdown: UrgencyBreakdown
    timeline_impact: Literal["HIGH", "MEDIUM", "LOW"]
    questions: List[PredictedQuestion]
    self_critique: QuestionsSelfCritique

    def get_high_urgency_questions(self) -> List[PredictedQuestion]:
        """Get only HIGH urgency questions"""
        return [q for q in self.questions if q.urgency == QuestionUrgency.HIGH]

    def get_fix_now_questions(self) -> List[PredictedQuestion]:
        """Get questions that should be fixed before release"""
        return [q for q in self.questions if q.recommendation == "FIX NOW"]

    def get_low_confidence_questions(self, threshold: int = 70) -> List[PredictedQuestion]:
        """Get questions below confidence threshold"""
        return [q for q in self.questions if q.confidence < threshold]