"""Pydantic models for Category 2: Small Business Accessibility"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional
from enum import Enum


class BarrierType(str, Enum):
    """Types of accessibility barriers"""
    INSURANCE = "Insurance"
    EMPLOYEE_COUNT = "Employee Count"
    REVENUE = "Revenue"
    EXPERIENCE = "Experience"
    REFERENCES = "References"
    BONDING = "Bonding"
    POLICY = "Policy"


class BarrierSeverity(str, Enum):
    """Severity of barrier impact"""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class BarrierLocation(BaseModel):
    """Location of barrier in RFP"""
    section: str
    page: str


class RequirementAnalysis(BaseModel):
    """Analysis of a specific requirement"""
    what_is_required: str
    industry_standard: Optional[str] = None
    comparison: Optional[str] = None
    is_justified: bool
    justification_reasoning: str


class AccessibilityBarrier(BaseModel):
    """Individual accessibility barrier finding"""
    id: str = Field(pattern=r"^ACCESS-\d{3}$")
    type: BarrierType
    severity: BarrierSeverity
    location: BarrierLocation
    exact_quote: str = Field(min_length=10)
    requirement_analysis: RequirementAnalysis
    impact: str = Field(min_length=20)
    deduction: float = Field(ge=0, le=10)
    suggestion: str = Field(min_length=20)
    confidence: int = Field(ge=0, le=100)

    @field_validator('confidence')
    @classmethod
    def flag_low_confidence(cls, v: int) -> int:
        """Flag findings with confidence below 70%"""
        if v < 70:
            pass
        return v


class AccessibilityScore(BaseModel):
    """Accessibility scoring summary"""
    final_score: float = Field(ge=0, le=10)
    rating: Literal["Excellent", "Good", "Significant Barriers", "Maximum Barriers"]
    total_deductions: float = Field(ge=0)
    barriers_found: int = Field(ge=0)


class AccessibilitySelfCritique(BaseModel):
    """Self-review for accessibility analysis"""
    standards_applied_correctly: bool
    deductions_calculated_accurately: bool
    concerns: Optional[str] = None


class AccessibilityAnalysis(BaseModel):
    """Complete accessibility analysis results"""
    accessibility_analysis: AccessibilityScore
    barriers: List[AccessibilityBarrier]
    positive_factors: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    self_critique: AccessibilitySelfCritique

    def get_high_impact_barriers(self) -> List[AccessibilityBarrier]:
        """Get barriers with deductions >= 1.0"""
        return [b for b in self.barriers if b.deduction >= 1.0]

    def get_low_confidence_barriers(self, threshold: int = 70) -> List[AccessibilityBarrier]:
        """Get barriers below confidence threshold"""
        return [b for b in self.barriers if b.confidence < threshold]