"""User prompt templates for all 4 analysis categories

Extracted from: workers/prompt_engineering.md
These are f-string functions that inject RFP text and metadata
"""

from typing import Dict, Any, List, Optional


# ============================================================================
# CATEGORY 1: IDENTIFIED RISKS
# Source: prompt_engineering.md lines 116-197
# ============================================================================

def build_risks_prompt(rfp_text: str, metadata: Dict[str, Any]) -> str:
    """Build user prompt for risk analysis

    Args:
        rfp_text: Extracted RFP section text
        metadata: Dict with rfp_title, agency_name, contract_type, estimated_value

    Returns:
        Formatted prompt string
    """
    return f"""# Task
Analyze the following RFP section for ambiguous/non-measurable language and other risks.

# RFP Context
- RFP Title: {metadata.get('rfp_title', 'Unknown')}
- Issuing Agency: {metadata.get('agency_name', 'Unknown')}
- Contract Type: {metadata.get('contract_type', 'IT Services')}
- Estimated Value: {metadata.get('estimated_value', 'Unknown')}

# RFP Section to Analyze
```
{rfp_text}
```

Section: {metadata.get('section_name', 'Full Document')}
Page Range: {metadata.get('page_range', 'All')}

# Analysis Instructions
1. Read the section carefully, identifying any ambiguous or non-measurable terms
2. For each issue found:
   a. Quote the exact problematic text
   b. Explain WHY it's problematic (what's ambiguous or non-measurable)
   c. Assess the impact if left unaddressed
   d. Suggest a specific fix with measurable criteria
   e. Rate your confidence (0-100%)

3. Check for:
   - Contradictions with other sections (if you have context)
   - Timeline conflicts
   - Over-specification (too many requirements)
   - Missing compliance requirements
   - Evaluation criteria issues

4. Before finalizing, review your findings:
   - Does each finding have an exact quote?
   - Is the location clearly specified?
   - Is the suggested fix concrete and measurable?
   - Have you avoided adding requirements not in the RFP?

# Output Format
Provide your analysis as valid JSON matching this structure:
{{
  "section_analyzed": {{
    "name": "string",
    "page_range": "string"
  }},
  "analysis_summary": {{
    "total_risks_found": 0,
    "high_severity": 0,
    "medium_severity": 0,
    "low_severity": 0,
    "overall_risk_level": "HIGH" | "MEDIUM" | "LOW"
  }},
  "risks": [
    {{
      "id": "RISK-001",
      "type": "Ambiguous Language" | "Over-Specification" | "Evaluation Criteria" | "Compliance" | "Timeline Conflict",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "location": {{
        "section": "string",
        "page": "string",
        "paragraph": "string or null"
      }},
      "exact_quote": "string",
      "issue_description": "string",
      "reasoning": "string",
      "impact_if_unresolved": "string",
      "suggested_fix": "string",
      "confidence": 0-100,
      "evidence": "string or null"
    }}
  ],
  "self_critique": {{
    "review_performed": true,
    "findings_validated": true,
    "concerns": "string or null"
  }}
}}
"""


# ============================================================================
# CATEGORY 2: SMALL BUSINESS ACCESSIBILITY
# Source: prompt_engineering.md lines 436-521
# ============================================================================

def build_accessibility_prompt(rfp_text: str, metadata: Dict[str, Any]) -> str:
    """Build user prompt for accessibility analysis

    Args:
        rfp_text: Extracted RFP sections (insurance, qualifications, policy)
        metadata: Dict with contract_type, estimated_value, risk_level

    Returns:
        Formatted prompt string
    """
    return f"""# Task
Analyze the following RFP for small business accessibility barriers.

# RFP Context
- Contract Type: {metadata.get('contract_type', 'IT Services')}
- Estimated Value: {metadata.get('estimated_value', 'Unknown')}
- Risk Level: {metadata.get('risk_level', 'standard')} (standard / high-risk / very-high-risk)

# RFP Sections to Analyze
```
{rfp_text}
```

# Analysis Instructions

Step 1: Identify each requirement that could be a barrier
- Insurance requirements (compare to standards in system prompt)
- Employee count requirements
- Revenue requirements
- Experience/past performance requirements
- Reference requirements
- Bonding requirements
- Small business policy (or lack thereof)

Step 2: For each potential barrier:
- Quote the exact requirement from RFP
- Determine if it's justified by contract needs
- Calculate appropriate deduction if unjustified
- Explain your reasoning

Step 3: Calculate final score
- Start at 10.0
- Subtract deductions
- Final score = 10.0 - total_deductions
- Rate accessibility: 9-10 Excellent, 7-8 Good, 4-6 Significant Barriers, 0-3 Maximum Barriers

Step 4: Self-review
- Have I compared insurance to the correct industry standards?
- Have I considered whether requirements are justified by contract needs?
- Are my deductions accurate per the scoring system?
- Have I quoted exact text for each barrier?

# Output Format
Provide your analysis as valid JSON matching this structure:
{{
  "accessibility_analysis": {{
    "final_score": 0.0,
    "rating": "Excellent" | "Good" | "Significant Barriers" | "Maximum Barriers",
    "total_deductions": 0.0,
    "barriers_found": 0
  }},
  "barriers": [
    {{
      "id": "ACCESS-001",
      "type": "Insurance" | "Employee Count" | "Revenue" | "Experience" | "References" | "Bonding" | "Policy",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "location": {{
        "section": "string",
        "page": "string"
      }},
      "exact_quote": "string",
      "requirement_analysis": {{
        "what_is_required": "string",
        "industry_standard": "string or null",
        "comparison": "string or null",
        "is_justified": true | false,
        "justification_reasoning": "string"
      }},
      "impact": "string",
      "deduction": 0.0,
      "suggestion": "string",
      "confidence": 0-100
    }}
  ],
  "positive_factors": ["string"],
  "recommendations": ["string"],
  "self_critique": {{
    "standards_applied_correctly": true,
    "deductions_calculated_accurately": true,
    "concerns": "string or null"
  }}
}}
"""


# ============================================================================
# CATEGORY 3: CLARIFYING QUESTIONS
# Source: prompt_engineering.md lines 620-720
# ============================================================================

def build_questions_prompt(
    rfp_text: str,
    metadata: Dict[str, Any],
    risks: Optional[List[Dict[str, Any]]] = None
) -> str:
    """Build user prompt for questions analysis

    Args:
        rfp_text: Extracted RFP section text
        metadata: Dict with section_name, page_number
        risks: Optional list of risks from Category 1 (used as context)

    Returns:
        Formatted prompt string
    """
    risks_context = ""
    if risks:
        risks_context = "\n\n# Context from Risk Analysis\nThe following risks were identified:\n"
        for risk in risks[:5]:  # Limit to top 5 risks
            risks_context += f"- {risk.get('issue_description', 'Unknown')}\n"

    return f"""# Task
Predict vendor questions from the following RFP section.

# RFP Section
```
{rfp_text}
```

Section: {metadata.get('section_name', 'Unknown')}
Page: {metadata.get('page_number', 'Unknown')}
{risks_context}

# Analysis Instructions

Step 1: Identify ambiguous or unclear statements
- Terms without definitions
- Scope statements that could have multiple interpretations
- Requirements that conflict or seem contradictory
- Missing information vendors need to price/propose

Step 2: For each ambiguity, formulate the question a vendor would ask
- Write in vendor's voice: "Does X mean Y or Z?"
- Be specific about what's unclear
- Reference the exact RFP text that's confusing

Step 3: Categorize urgency
- HIGH: Prevents accurate pricing or eligibility determination
- MEDIUM: Affects proposal strategy but not blocking
- LOW: Administrative only

Step 4: Assess impact and suggest fix
- What happens if vendor guesses wrong?
- How should RFP text be clarified?

Step 5: Self-review
- Is this genuinely ambiguous or am I overthinking?
- Would a reasonable vendor actually ask this?
- Is my urgency level justified?

# Output Format
Provide your analysis as valid JSON matching this structure:
{{
  "section_analyzed": "string",
  "questions_predicted": 0,
  "urgency_breakdown": {{
    "high": 0,
    "medium": 0,
    "low": 0
  }},
  "timeline_impact": "HIGH" | "MEDIUM" | "LOW",
  "questions": [
    {{
      "id": "Q-001",
      "urgency": "HIGH" | "MEDIUM" | "LOW",
      "priority": 1,
      "predicted_question": "string",
      "triggered_by": {{
        "exact_quote": "string",
        "location": "string"
      }},
      "confusion_analysis": {{
        "why_confusing": "string",
        "possible_interpretations": ["string", "string"],
        "vendor_cannot_determine": "string"
      }},
      "urgency_justification": "string",
      "impact_if_unresolved": "string",
      "recommendation": "FIX NOW" | "CLARIFY IN Q&A",
      "suggested_fix": "string",
      "confidence": 0-100
    }}
  ],
  "self_critique": {{
    "questions_are_realistic": true,
    "urgency_levels_justified": true,
    "concerns": "string or null"
  }}
}}
"""


# ============================================================================
# CATEGORY 4: SUBCONTRACTING OPPORTUNITIES
# Source: prompt_engineering.md lines 791-860
# ============================================================================

def build_subcontracting_prompt(rfp_text: str, metadata: Dict[str, Any]) -> str:
    """Build user prompt for subcontracting analysis

    Args:
        rfp_text: Extracted RFP sections (scope, subcontracting policy)
        metadata: Dict with estimated_value

    Returns:
        Formatted prompt string
    """
    return f"""# Task
Identify subcontracting opportunities in the following RFP.

# RFP Scope
```
{rfp_text}
```

Contract Value: {metadata.get('estimated_value', 'Unknown')}

# Analysis Instructions

Step 1: Check if RFP has subcontracting requirement/encouragement
- Required, encouraged, or not mentioned?
- Any specific goals or percentages?

Step 2: Identify discrete work packages in scope
- Look for services that are:
  * Lower complexity
  * Can be performed independently
  * Geographically flexible
  * Don't require prime contractor's core expertise

Step 3: For each opportunity:
- Quote relevant RFP text
- Estimate value (as % of total contract)
- Identify suitable business types
- Map to NAICS code
- Explain reasoning

Step 4: Self-review
- Are these opportunities actually in the RFP scope?
- Are my value estimates realistic?
- Have I explained why each is suitable for subcontracting?

# Output Format
Provide your analysis as valid JSON matching this structure:
{{
  "subcontracting_analysis": {{
    "rfp_requirement": "mandatory" | "encouraged" | "none",
    "goals_specified": true | false,
    "goal_percentage": 0.0 | null,
    "opportunities_found": 0,
    "total_estimated_value": "string"
  }},
  "opportunities": [
    {{
      "id": "SUB-001",
      "area": "string",
      "rfp_text": "string",
      "location": "string",
      "estimated_percentage": "10-20%",
      "estimated_value": "$50,000 - $100,000",
      "characteristics": ["string"],
      "suitable_business_types": ["string"],
      "naics_code": "string",
      "naics_description": "string",
      "size_standard": "string or null",
      "reasoning": "string",
      "confidence": 0-100
    }}
  ],
  "recommendations": ["string"],
  "note": "State/local subcontracting requirements vary. This analysis identifies opportunities based on scope, not regulatory compliance.",
  "self_critique": {{
    "opportunities_are_realistic": true,
    "estimates_are_justified": true,
    "concerns": "string or null"
  }}
}}
"""