"""Pydantic models for Category 1: Identified Risks"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional
from enum import Enum


class RiskType(str, Enum):
    """Types of risks that can be identified"""
    AMBIGUOUS_LANGUAGE = "Ambiguous Language"
    OVER_SPECIFICATION = "Over-Specification"
    EVALUATION_CRITERIA = "Evaluation Criteria"
    COMPLIANCE = "Compliance"
    TIMELINE_CONFLICT = "Timeline Conflict"


class RiskSeverity(str, Enum):
    """Severity levels for risks"""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RiskLocation(BaseModel):
    """Location information for a risk in the RFP"""
    section: str
    page: str
    paragraph: Optional[str] = None


class Risk(BaseModel):
    """Individual risk finding"""
    id: str = Field(pattern=r"^RISK-\d{3}$")
    type: RiskType
    severity: RiskSeverity
    location: RiskLocation
    exact_quote: str = Field(min_length=10)
    issue_description: str = Field(min_length=20)
    reasoning: str = Field(min_length=50)
    impact_if_unresolved: str = Field(min_length=20)
    suggested_fix: str = Field(min_length=20)
    confidence: int = Field(ge=0, le=100)
    evidence: Optional[str] = None

    @field_validator('confidence')
    @classmethod
    def flag_low_confidence(cls, v: int) -> int:
        """Flag findings with confidence below 70%"""
        if v < 70:
            # Could add logging or flagging here
            pass
        return v


class AnalysisSummary(BaseModel):
    """Summary statistics for risk analysis"""
    total_risks_found: int = Field(ge=0)
    high_severity: int = Field(ge=0)
    medium_severity: int = Field(ge=0)
    low_severity: int = Field(ge=0)
    overall_risk_level: Literal["HIGH", "MEDIUM", "LOW"]


class SelfCritique(BaseModel):
    """Self-review results from the LLM"""
    review_performed: bool
    findings_validated: bool
    concerns: Optional[str] = None


class SectionAnalyzed(BaseModel):
    """Information about the section that was analyzed"""
    name: str
    page_range: str


class RisksAnalysis(BaseModel):
    """Complete risk analysis results for an RFP section"""
    section_analyzed: SectionAnalyzed
    analysis_summary: AnalysisSummary
    risks: List[Risk]
    self_critique: SelfCritique

    def get_high_priority_risks(self) -> List[Risk]:
        """Get only HIGH severity risks"""
        return [r for r in self.risks if r.severity == RiskSeverity.HIGH]

    def get_low_confidence_risks(self, threshold: int = 70) -> List[Risk]:
        """Get risks below confidence threshold"""
        return [r for r in self.risks if r.confidence < threshold]