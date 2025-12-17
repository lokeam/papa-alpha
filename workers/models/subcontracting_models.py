"""Pydantic models for Category 4: Subcontracting Opportunities"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional


class SubcontractingRequirement(str):
    """RFP subcontracting requirement level"""
    MANDATORY = "mandatory"
    ENCOURAGED = "encouraged"
    NONE = "none"


class SubcontractingOpportunity(BaseModel):
    """Individual subcontracting opportunity"""
    id: str = Field(pattern=r"^SUB-\d{3}$")
    area: str = Field(min_length=5)
    rfp_text: str = Field(min_length=20)
    location: str
    estimated_percentage: str = Field(pattern=r"^\d+-\d+%$")  # e.g., "10-20%"
    estimated_value: str = Field(pattern=r"^\$[\d,]+ - \$[\d,]+$")  # e.g., "$50,000 - $100,000"
    characteristics: List[str] = Field(min_items=1)
    suitable_business_types: List[str] = Field(min_items=1)
    naics_code: str
    naics_description: str
    size_standard: Optional[str] = None
    reasoning: str = Field(min_length=50)
    confidence: int = Field(ge=0, le=100)

    @field_validator('confidence')
    @classmethod
    def flag_low_confidence(cls, v: int) -> int:
        """Flag findings with confidence below 70%"""
        if v < 70:
            pass
        return v


class SubcontractingAnalysisSummary(BaseModel):
    """Summary of subcontracting analysis"""
    rfp_requirement: Literal["mandatory", "encouraged", "none"]
    goals_specified: bool
    goal_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    opportunities_found: int = Field(ge=0)
    total_estimated_value: str  # e.g., "$150,000 - $300,000"


class SubcontractingSelfCritique(BaseModel):
    """Self-review for subcontracting analysis"""
    opportunities_are_realistic: bool
    estimates_are_justified: bool
    concerns: Optional[str] = None


class SubcontractingAnalysis(BaseModel):
    """Complete subcontracting opportunities analysis"""
    subcontracting_analysis: SubcontractingAnalysisSummary
    opportunities: List[SubcontractingOpportunity]
    recommendations: List[str] = Field(default_factory=list)
    note: str = "State/local subcontracting requirements vary. This analysis identifies opportunities based on scope, not regulatory compliance."
    self_critique: SubcontractingSelfCritique

    def get_high_value_opportunities(self) -> List[SubcontractingOpportunity]:
        """Get opportunities with estimated percentage >= 15%"""
        return [
            opp for opp in self.opportunities
            if int(opp.estimated_percentage.split('-')[0].rstrip('%')) >= 15
        ]

    def get_low_confidence_opportunities(self, threshold: int = 70) -> List[SubcontractingOpportunity]:
        """Get opportunities below confidence threshold"""
        return [opp for opp in self.opportunities if opp.confidence < threshold]