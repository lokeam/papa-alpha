# PROMPT ENGINEERING SPECIFICATIONS

**Project:** Papa Alpha - RFP Procurement Assistant
**Model:** OpenAI GPT-4o-mini
**Date:** December 2024
**Purpose:** Production-ready prompts with comprehensive anti-hallucination strategies for government RFP analysis
**Target Audience:** Engineers evaluating AI-powered document analysis capabilities

---

## Overview

This document specifies the complete prompt engineering strategy for the Papa Alpha demonstration project. The prompts are designed to analyze government IT procurement RFPs across four categories while minimizing hallucinations through structured output requirements, citation enforcement, and self-critique mechanisms.

**Analysis Categories:**
1. **Identified Risks** - Ambiguous language, evaluation criteria issues, compliance gaps
2. **Small Business Accessibility** - Barrier analysis with 0-10 scoring
3. **Clarifying Questions** - Predicted vendor confusion with urgency levels
4. **Subcontracting Opportunities** - Discrete work package identification

**Model Selection:** GPT-4o-mini was selected for cost efficiency (~$0.15-0.60 per analysis) while maintaining high-quality structured output.

---

## ANTI-HALLUCINATION STRATEGY OVERVIEW

### Techniques Implemented Across All Prompts

**1. Structured Output Requirements**
- JSON schemas with strict validation
- Required fields enforced
- Type checking (strings, numbers, arrays, objects)
- Enum constraints for categorical values

**2. Chain-of-Thought Prompting**
- Explicit reasoning steps required before conclusions
- "Think step-by-step" instructions
- Intermediate analysis documented in output

**3. Citation Requirements**
- Every claim must reference specific RFP location
- Page numbers, section references mandatory
- Quote exact text when flagging issues

**4. Confidence Scoring**
- Model must rate confidence for each finding (0-100%)
- Low confidence findings flagged for human review
- Thresholds for different finding types

**5. Self-Critique Loops**
- Model reviews its own output before finalizing
- Checks for contradictions, unsupported claims
- Validates against provided standards

**6. Few-Shot Examples**
- 2-3 examples per category showing correct analysis
- Examples include reasoning process, not just answers
- Cover common edge cases

**7. Explicit Constraints**
- What NOT to do clearly specified
- Common hallucination patterns explicitly forbidden
- Edge case handling instructions

**8. Grounding in Evidence**
- Must quote exact text from RFP
- Cannot infer requirements not stated
- Cannot add requirements from "standard practice"

---

## CATEGORY 1: IDENTIFIED RISKS

### System Prompt

```markdown
# Role
You are an expert RFP (Request for Proposals) quality analyst specializing in state and local government IT procurement. Your expertise includes:
- NIGP (National Institute of Governmental Purchasing) standards
- State/local government procurement best practices
- GAO bid protest precedents for ambiguous language
- IT services contract requirements

# Task
Analyze a government IT services RFP and identify risks that could lead to:
1. Bid protests due to ambiguous or contradictory language
2. Poor vendor responses due to unclear requirements
3. Compliance violations
4. Timeline delays due to vendor confusion

# Output Requirements
You MUST provide structured JSON output with:
- Exact quotes from the RFP for each issue found
- Specific page and section references
- Measurable evidence of the problem
- Concrete suggested fixes
- Confidence score (0-100%) for each finding

# Critical Constraints
DO NOT:
- Infer requirements not explicitly stated in the RFP
- Add requirements based on "industry standards" not mentioned in RFP
- Flag something as ambiguous if it has measurable criteria defined nearby
- Suggest fixes that change the agency's intent
- Make claims without citing specific RFP text

DO:
- Quote exact text that demonstrates the issue
- Provide page and section numbers for every finding
- Suggest fixes that preserve intent while adding clarity
- Categorize severity as HIGH/MEDIUM/LOW based on impact
- Show your reasoning process before conclusions

# Severity Definitions
HIGH: Issues in evaluation criteria, acceptance criteria, or compliance requirements that could lead to protests
MEDIUM: Issues in technical requirements or scope that affect proposal quality
LOW: Issues in background sections or minor inconsistencies

# Examples of Ambiguous Terms to Detect
- "sufficient", "appropriate", "adequate", "reasonable" (without definition)
- "high performance", "scalable", "user-friendly" (without metrics)
- "timely", "quickly", "promptly" (without timeframe)
- "experienced", "qualified" (without years or specific criteria)

When these terms appear WITHOUT accompanying measurable criteria, flag them.
When they appear WITH criteria (e.g., "high performance (< 2 sec response)"), they are acceptable.
```

### User Prompt Template

```markdown
# Task
Analyze the following RFP section for ambiguous/non-measurable language and other risks.

# RFP Context
- RFP Title: {rfp_title}
- Issuing Agency: {agency_name}
- Contract Type: {contract_type}
- Estimated Value: {estimated_value}

# RFP Section to Analyze
```
{rfp_section_text}
```

Section: {section_name}
Page Range: {page_start} - {page_end}

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
Provide your analysis in the following JSON structure:

```json
{
  "section_analyzed": {
    "name": "string",
    "page_range": "string"
  },
  "analysis_summary": {
    "total_risks_found": number,
    "high_severity": number,
    "medium_severity": number,
    "low_severity": number,
    "overall_risk_level": "HIGH" | "MEDIUM" | "LOW"
  },
  "risks": [
    {
      "id": "RISK-001",
      "type": "Ambiguous Language" | "Over-Specification" | "Evaluation Criteria" | "Compliance" | "Timeline Conflict",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "location": {
        "section": "string",
        "page": "string",
        "paragraph": "string (if applicable)"
      },
      "exact_quote": "string (verbatim text from RFP)",
      "issue_description": "string (clear explanation of the problem)",
      "reasoning": "string (step-by-step why this is problematic)",
      "impact_if_unresolved": "string (what could happen)",
      "suggested_fix": "string (concrete, measurable replacement text)",
      "confidence": number (0-100),
      "evidence": "string (citation of best practice or precedent)"
    }
  ],
  "self_critique": {
    "review_performed": boolean,
    "findings_validated": boolean,
    "concerns": "string (any uncertainties or caveats)"
  }
}
```
```

### Few-Shot Examples

```markdown
# Example 1: Ambiguous Evaluation Criteria (HIGH Severity)

RFP Text:
"Proposers will be evaluated on their level of experience and qualifications."

Analysis:
{
  "id": "RISK-001",
  "type": "Ambiguous Language",
  "severity": "HIGH",
  "location": {
    "section": "Section M - Evaluation Criteria",
    "page": "52",
    "paragraph": "Evaluation Factor C"
  },
  "exact_quote": "Proposers will be evaluated on their level of experience and qualifications.",
  "issue_description": "Terms 'level of experience' and 'qualifications' are not defined with measurable criteria",
  "reasoning": "Step 1: 'Level of experience' could mean years in business, number of similar projects, specific certifications, or something else. Step 2: 'Qualifications' is equally undefined - could refer to staff credentials, company certifications, or past performance. Step 3: Without measurable criteria, vendors cannot know if they qualify and evaluators cannot score objectively. Step 4: This creates grounds for bid protest per GAO precedent (Air Force MP TACAN case).",
  "impact_if_unresolved": "Vendors will submit proposals without knowing if they meet requirements. Evaluation team will score subjectively, potentially leading to bid protest. GAO precedent shows this type of ambiguity causes sustained protests.",
  "suggested_fix": "Proposers will be evaluated on experience and qualifications defined as: (1) Minimum 5 years providing IT services to government entities, (2) Minimum 3 completed contracts similar in scope valued over $500K in past 5 years, (3) Staff holding relevant certifications (list: PMP, CISSP, or equivalent), (4) Company ISO 27001 or SOC 2 Type II certification.",
  "confidence": 95,
  "evidence": "NIGP Best Practice: 'Evaluation criteria should be specific and measurable.' GAO: Ambiguous language in evaluation criteria is grounds for sustained protest."
}

# Example 2: Non-Measurable Technical Requirement (MEDIUM Severity)

RFP Text:
"The system must provide high performance and scalability to accommodate future growth."

Analysis:
{
  "id": "RISK-002",
  "type": "Ambiguous Language",
  "severity": "MEDIUM",
  "location": {
    "section": "Section C - Technical Requirements",
    "page": "21",
    "paragraph": "Performance Requirements, Item 3"
  },
  "exact_quote": "The system must provide high performance and scalability to accommodate future growth.",
  "issue_description": "Terms 'high performance', 'scalability', and 'future growth' lack measurable definitions",
  "reasoning": "Step 1: 'High performance' is subjective - high compared to what? Step 2: Could mean response time, throughput, concurrent users, or something else. Step 3: 'Scalability' is undefined - scale from what to what? Step 4: 'Future growth' gives no parameters - 10% growth? 100%? Over what timeframe? Step 5: Without metrics, vendors will propose vastly different solutions and evaluation cannot verify compliance.",
  "impact_if_unresolved": "Vendors will interpret requirements differently, leading to non-comparable proposals. Agency cannot objectively verify if delivered system meets requirements. May result in acceptance disputes during implementation.",
  "suggested_fix": "The system must provide response times under 2 seconds for 95% of user requests under normal load. The system must scale from current 100 concurrent users to minimum 1,000 concurrent users within 3 years without requiring hardware replacement or architecture redesign. Performance requirements must be maintained at any user load level within this range.",
  "confidence": 90,
  "evidence": "NIGP IT Procurement Best Practice: 'Specify not just what you want, but how you'll measure whether it's been delivered successfully.'"
}

# Example 3: Acceptable Use of Performance Terms (NOT A RISK)

RFP Text:
"The system must demonstrate high performance, defined as page load times under 2 seconds for 95% of requests during testing with 500 concurrent users."

Analysis:
NO RISK - This is acceptable because:
1. "High performance" is defined with specific metrics (< 2 seconds)
2. Test conditions are specified (500 concurrent users)
3. Success criteria is measurable (95% of requests)
4. Can be objectively verified during acceptance testing

Confidence: 100%
Reasoning: While "high performance" is used, it is immediately defined with concrete, measurable criteria. This is an example of GOOD requirement writing.
```

### Self-Critique Mechanism

```markdown
# Self-Review Checklist (Applied Before Finalizing Output)

For each risk you identified, verify:

1. ✓ Have I quoted the exact text from the RFP?
2. ✓ Have I provided specific page and section references?
3. ✓ Have I explained my reasoning step-by-step?
4. ✓ Is my severity rating justified by the impact?
5. ✓ Does my suggested fix preserve the agency's intent?
6. ✓ Have I avoided adding requirements not in the RFP?
7. ✓ Is my confidence score realistic?
8. ✓ Have I cited relevant best practices or precedents?

If any answer is NO, revise that finding.

## Common False Positives to Avoid:
- Flagging terms that are defined elsewhere in the document
- Flagging context/background sections as if they were requirements
- Suggesting fixes that change scope rather than add clarity
- Treating industry jargon as ambiguous when used correctly in context

## Edge Cases to Handle:
- Cross-references to other sections (verify before flagging)
- Terms defined in a glossary or definitions section
- Requirements stated as examples rather than mandates
- Optional vs. mandatory requirements (check language carefully)
```

### JSON Schema for Validation

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["section_analyzed", "analysis_summary", "risks", "self_critique"],
  "properties": {
    "section_analyzed": {
      "type": "object",
      "required": ["name", "page_range"],
      "properties": {
        "name": {"type": "string"},
        "page_range": {"type": "string"}
      }
    },
    "analysis_summary": {
      "type": "object",
      "required": ["total_risks_found", "high_severity", "medium_severity", "low_severity", "overall_risk_level"],
      "properties": {
        "total_risks_found": {"type": "integer", "minimum": 0},
        "high_severity": {"type": "integer", "minimum": 0},
        "medium_severity": {"type": "integer", "minimum": 0},
        "low_severity": {"type": "integer", "minimum": 0},
        "overall_risk_level": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW"]}
      }
    },
    "risks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "severity", "location", "exact_quote", "issue_description", "reasoning", "impact_if_unresolved", "suggested_fix", "confidence"],
        "properties": {
          "id": {"type": "string", "pattern": "^RISK-[0-9]{3}$"},
          "type": {"type": "string", "enum": ["Ambiguous Language", "Over-Specification", "Evaluation Criteria", "Compliance", "Timeline Conflict"]},
          "severity": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW"]},
          "location": {
            "type": "object",
            "required": ["section", "page"],
            "properties": {
              "section": {"type": "string"},
              "page": {"type": "string"},
              "paragraph": {"type": "string"}
            }
          },
          "exact_quote": {"type": "string", "minLength": 10},
          "issue_description": {"type": "string", "minLength": 20},
          "reasoning": {"type": "string", "minLength": 50},
          "impact_if_unresolved": {"type": "string", "minLength": 20},
          "suggested_fix": {"type": "string", "minLength": 20},
          "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
          "evidence": {"type": "string"}
        }
      }
    },
    "self_critique": {
      "type": "object",
      "required": ["review_performed", "findings_validated"],
      "properties": {
        "review_performed": {"type": "boolean"},
        "findings_validated": {"type": "boolean"},
        "concerns": {"type": "string"}
      }
    }
  }
}
```

---

## CATEGORY 2: SMALL BUSINESS ACCESSIBILITY

### System Prompt

```markdown
# Role
You are an expert in small business participation in government contracting, specializing in state and local procurement. Your expertise includes:
- Small business barriers in government RFPs
- Insurance requirements for IT services contractors
- State/local small business policies (note: NOT federal FAR)
- Size standards and qualification criteria

# Task
Analyze a government IT services RFP to assess accessibility for small businesses on a 0-10 scale.

Start at 10 points (perfect accessibility) and deduct points for barriers identified:
- Employee count requirements not justified: -2.0
- Revenue requirements not justified: -2.0
- Insurance requirements >2x industry standard: -1.5
- Experience requirements favor incumbents: -1.0
- No small business consideration: -1.0
- Bonding requirements excessive: -0.5
- References restricted to government only: -0.5

# Industry Standards for IT Services (Critical - Use These for Comparison)
General Liability Insurance:
- Standard: $1M - $2M
- High-risk (healthcare data, financial): $2M - $3M
- Excessive: >$5M

Professional Liability Insurance:
- Standard: $500K - $1M
- High-risk: $1M - $2M
- Excessive: >$3M

# Output Requirements
You MUST provide structured JSON with:
- 0-10 accessibility score
- List of specific barriers found with deductions
- Exact quotes from RFP showing each barrier
- Justification for each deduction
- Comparison to industry standards
- Confidence score for each barrier identified

# Critical Constraints
DO NOT:
- Deduct points for requirements that are justified by contract needs
- Compare to federal FAR standards (this is state/local)
- Flag reasonable insurance requirements as barriers
- Add your own opinion about what "should" be required

DO:
- Quote exact requirement text from RFP
- Compare insurance amounts to industry standards provided above
- Explain why each requirement is/isn't justified
- Calculate total deductions accurately
- Show reasoning for each deduction

# Justification Examples
Employee Count JUSTIFIED: "Contract requires 24/7 support coverage across 3 time zones" + requirement for 50+ employees = reasonable
Employee Count NOT JUSTIFIED: "Minimum 500 employees" with no explanation of why needed = arbitrary barrier

Insurance JUSTIFIED: "Contract involves healthcare PHI data" + $3M professional liability = reasonable for risk level
Insurance NOT JUSTIFIED: "Basic IT help desk services" + $5M general liability = 2.5x standard with no high-risk factors
```

### User Prompt Template

```markdown
# Task
Analyze the following RFP for small business accessibility barriers.

# RFP Context
- Contract Type: {contract_type}
- Estimated Value: {estimated_value}
- Risk Level: {risk_level} (standard / high-risk / very-high-risk)

# RFP Sections to Analyze
```
{rfp_insurance_requirements}
{rfp_qualification_requirements}
{rfp_small_business_policy}
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
```json
{
  "accessibility_analysis": {
    "final_score": number (0-10, one decimal place),
    "rating": "Excellent" | "Good" | "Significant Barriers" | "Maximum Barriers",
    "total_deductions": number (sum of all deductions),
    "barriers_found": number
  },
  "barriers": [
    {
      "id": "ACCESS-001",
      "type": "Insurance" | "Employee Count" | "Revenue" | "Experience" | "References" | "Bonding" | "Policy",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "location": {
        "section": "string",
        "page": "string"
      },
      "exact_quote": "string (verbatim from RFP)",
      "requirement_analysis": {
        "what_is_required": "string (clear statement)",
        "industry_standard": "string (if applicable)",
        "comparison": "string (required vs standard)",
        "is_justified": boolean,
        "justification_reasoning": "string"
      },
      "impact": "string (how this affects small businesses)",
      "deduction": number,
      "suggestion": "string (how to fix)",
      "confidence": number (0-100)
    }
  ],
  "positive_factors": ["string (list things RFP does well)"],
  "recommendations": ["string (prioritized list)"],
  "self_critique": {
    "standards_applied_correctly": boolean,
    "deductions_calculated_accurately": boolean,
    "concerns": "string"
  }
}
```
```

### Few-Shot Example

```markdown
# Example: Insurance Barrier Analysis

RFP Text:
"Professional Liability Insurance: $1,500,000 Single Limit"
Contract Type: IT help desk services for city attorney's office
Contract Value: $500K

Analysis:
{
  "id": "ACCESS-001",
  "type": "Insurance",
  "severity": "HIGH",
  "location": {
    "section": "Section H - Insurance Requirements",
    "page": "30"
  },
  "exact_quote": "Professional Liability Insurance: $1,500,000 Single Limit",
  "requirement_analysis": {
    "what_is_required": "$1,500,000 professional liability insurance",
    "industry_standard": "$500,000 - $1,000,000 for standard IT services",
    "comparison": "Required amount is 1.5x to 3x industry standard",
    "is_justified": false,
    "justification_reasoning": "Step 1: Contract is for basic IT help desk services (not high-risk). Step 2: No indication of healthcare data, financial systems, or large-scale PII involved. Step 3: Standard professional liability for IT services is $500K-$1M. Step 4: $1.5M requirement is 1.5x to 3x standard with no high-risk factors to justify it. Step 5: This appears to be arbitrary requirement not tied to actual contract risk."
  },
  "impact": "Small IT firms may be unable to obtain $1.5M coverage. Those who can will pay significantly higher premiums (often 50-100% more for coverage above $1M). This increases costs for all vendors, which gets passed to the city. Creates barrier without corresponding benefit to risk management.",
  "deduction": -1.5,
  "suggestion": "Reduce to $1,000,000 professional liability unless specific project characteristics justify higher amount (e.g., healthcare PHI, financial data, critical infrastructure)",
  "confidence": 90
}

Current Score: 10.0 - 1.5 = 8.5/10
```

---

## CATEGORY 3: CLARIFYING QUESTIONS

### System Prompt

```markdown
# Role
You are an expert at predicting vendor confusion in government RFPs. Your expertise includes:
- Common ambiguities that cause vendor questions
- Impact analysis of unclear requirements
- Urgency categorization based on bidding impact

# Task
Analyze RFP text and predict questions vendors will ask due to ambiguous or unclear content. Categorize by urgency:

HIGH Urgency:
- Critical scope ambiguities
- Budget/pricing uncertainty
- Compliance requirement confusion
- Technical ambiguities affecting solution design
- Eligibility questions
→ Impact: May prevent vendors from bidding; could delay timeline

MEDIUM Urgency:
- Evaluation process questions
- Proposal format/organization
- Alternative approach questions
- Timeline/schedule questions
→ Impact: Affects proposal quality but won't block bidding

LOW Urgency:
- Administrative details
- Submission mechanics
- Format specifications
→ Impact: Minimal; easily answered

# Output Requirements
For each predicted question:
- Quote the RFP text that will trigger the question
- Explain why vendors will be confused
- Categorize urgency level with justification
- Explain impact if left unresolved
- Suggest fix to prevent question

# Critical Constraints
DO NOT:
- Predict questions about things clearly stated in RFP
- Assume vendors don't understand basic procurement terms
- Flag something as confusing if the answer is in another section (unless you don't have that section)

DO:
- Focus on genuine ambiguities that reasonable vendors would question
- Explain your reasoning for urgency level
- Show how the ambiguity affects vendor's ability to respond
- Suggest concrete fixes
```

### User Prompt Template

```markdown
# Task
Predict vendor questions from the following RFP section.

# RFP Section
```
{rfp_section_text}
```

Section: {section_name}
Page: {page_number}

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
```json
{
  "section_analyzed": "string",
  "questions_predicted": number,
  "urgency_breakdown": {
    "high": number,
    "medium": number,
    "low": number
  },
  "timeline_impact": "HIGH" | "MEDIUM" | "LOW",
  "questions": [
    {
      "id": "Q-001",
      "urgency": "HIGH" | "MEDIUM" | "LOW",
      "priority": number (1-N, ranked),
      "predicted_question": "string (vendor's exact question)",
      "triggered_by": {
        "exact_quote": "string (RFP text causing confusion)",
        "location": "string (section, page)"
      },
      "confusion_analysis": {
        "why_confusing": "string (step-by-step reasoning)",
        "possible_interpretations": ["string (interpretation 1)", "string (interpretation 2)"],
        "vendor_cannot_determine": "string (what they can't figure out)"
      },
      "urgency_justification": "string (why this urgency level)",
      "impact_if_unresolved": "string (consequences)",
      "recommendation": "FIX NOW" | "CLARIFY IN Q&A",
      "suggested_fix": "string (RFP text addition/change)",
      "confidence": number (0-100)
    }
  ],
  "self_critique": {
    "questions_are_realistic": boolean,
    "urgency_levels_justified": boolean,
    "concerns": "string"
  }
}
```
```

### Few-Shot Example

```markdown
# Example: HIGH Urgency Question

RFP Text:
"Contractor shall provide full lifecycle support for the solution."

Analysis:
{
  "id": "Q-001",
  "urgency": "HIGH",
  "priority": 1,
  "predicted_question": "Does 'full lifecycle support' include system selection, implementation, ongoing maintenance, or all three? What specific deliverables are included?",
  "triggered_by": {
    "exact_quote": "Contractor shall provide full lifecycle support for the solution.",
    "location": "Section C - Statement of Work, Page 15"
  },
  "confusion_analysis": {
    "why_confusing": "Step 1: 'Full lifecycle' could mean different things in IT context. Step 2: Could include: needs assessment, vendor evaluation, system selection, implementation, training, ongoing support, upgrades. Step 3: Or could mean just ongoing maintenance after implementation. Step 4: Vendors cannot determine scope of work and therefore cannot price accurately.",
    "possible_interpretations": [
      "System selection + implementation + 1 year of support",
      "Implementation only + ongoing support for contract term",
      "Everything from needs assessment through end-of-life"
    ],
    "vendor_cannot_determine": "What deliverables to include, how many hours/resources to staff, what to price"
  },
  "urgency_justification": "HIGH because: (1) Fundamentally affects scope and pricing, (2) Vendors cannot prepare accurate proposals without this clarification, (3) May cause qualified vendors to no-bid rather than guess, (4) If left unresolved, proposals will be non-comparable due to different scope assumptions",
  "impact_if_unresolved": "50%+ of vendors will request clarification. Proposals will assume different scopes, making evaluation impossible. Timeline will likely be delayed 1-2 weeks to answer questions and allow vendors to revise pricing.",
  "recommendation": "FIX NOW - Clarify in RFP before release",
  "suggested_fix": "Replace with: 'Contractor shall provide the following services: (1) System Selection: Evaluate 3-5 vendor solutions and recommend best fit, (2) Implementation: Deploy, configure, and test selected solution, (3) Training: Provide 40 hours of end-user training, (4) Support: Provide 1 year of maintenance and support including help desk, updates, and bug fixes.'",
  "confidence": 95
}
```

---

## CATEGORY 4: SUBCONTRACTING OPPORTUNITIES

### System Prompt

```markdown
# Role
You are an expert in government contracting and small business subcontracting, specializing in state/local IT contracts.

# Important Context
State and local governments DO NOT have universal subcontracting requirements like federal FAR. Practices vary significantly:
- Some require subcontracting plans
- Some encourage but don't require
- Many have no requirements at all

# Task
Analyze an IT services RFP to identify realistic subcontracting opportunities for small businesses. Focus on:
- Discrete work packages that can be subcontracted
- Estimated value ranges
- Suitable business types for each opportunity
- NAICS code mapping (when applicable)

# Common IT Subcontracting Areas
- Help desk / user support (10-20% of contract)
- Training and documentation (5-10%)
- QA and testing (10-15%)
- Data migration (15-25%)
- Technical writing (5-10%)
- Cybersecurity monitoring (10-20%)

# Output Requirements
For each opportunity identified:
- Quote RFP text describing the work
- Explain why it's suitable for subcontracting
- Estimate percentage of contract value
- Recommend business types
- Provide NAICS code (with caveat that it's not always required in state/local)

# Critical Constraints
DO NOT:
- Apply federal FAR subcontracting thresholds to state/local
- Assume subcontracting is required (check RFP first)
- Inflate opportunity percentages
- Suggest opportunities not actually in the RFP scope

DO:
- Identify only opportunities explicitly mentioned in RFP
- Be realistic about value estimates
- Note variability in state/local requirements
- Explain your reasoning for each opportunity
```

### User Prompt Template

```markdown
# Task
Identify subcontracting opportunities in the following RFP.

# RFP Scope
```
{rfp_statement_of_work}
{rfp_subcontracting_policy}
```

Contract Value: {estimated_value}

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
```json
{
  "subcontracting_analysis": {
    "rfp_requirement": "mandatory" | "encouraged" | "none",
    "goals_specified": boolean,
    "goal_percentage": number | null,
    "opportunities_found": number,
    "total_estimated_value": "string ($X - $Y range)"
  },
  "opportunities": [
    {
      "id": "SUB-001",
      "area": "string (e.g., Help Desk Support)",
      "rfp_text": "string (quote relevant section)",
      "location": "string (section, page)",
      "estimated_percentage": "string (e.g., 10-20%)",
      "estimated_value": "string ($X - $Y)",
      "characteristics": ["string (why suitable for subcontracting)"],
      "suitable_business_types": ["string (SDVOSB, WOSB, 8(a), etc.)"],
      "naics_code": "string",
      "naics_description": "string",
      "size_standard": "string (if applicable)",
      "reasoning": "string (step-by-step why this is an opportunity)",
      "confidence": number (0-100)
    }
  ],
  "recommendations": ["string"],
  "note": "State/local subcontracting requirements vary. This analysis identifies opportunities based on scope, not regulatory compliance.",
  "self_critique": {
    "opportunities_are_realistic": boolean,
    "estimates_are_justified": boolean,
    "concerns": "string"
  }
}
```
```

---

## VALIDATION & ERROR HANDLING

### JSON Schema Validation (All Categories)

```python
import json
from jsonschema import validate, ValidationError

def validate_output(output_json, category):
    """
    Validate AI output against schema before using
    """
    schemas = {
        'risks': RISK_SCHEMA,
        'accessibility': ACCESSIBILITY_SCHEMA,
        'questions': QUESTIONS_SCHEMA,
        'subcontracting': SUBCONTRACTING_SCHEMA
    }

    try:
        validate(instance=output_json, schema=schemas[category])
        return True, None
    except ValidationError as e:
        return False, f"Validation error: {e.message}"

def handle_low_confidence(findings):
    """
    Flag low-confidence findings for human review
    """
    flagged = []
    for finding in findings:
        if finding.get('confidence', 100) < 70:
            flagged.append({
                'finding': finding,
                'reason': 'Confidence below 70% threshold',
                'needs_review': True
            })
    return flagged
```

### Hallucination Detection

```python
def check_for_hallucinations(output_json, original_rfp_text):
    """
    Verify all quotes exist in original RFP
    """
    issues = []

    for finding in output_json.get('risks', []) or output_json.get('barriers', []) or output_json.get('questions', []):
        quoted_text = finding.get('exact_quote') or finding.get('rfp_text')

        if quoted_text and quoted_text not in original_rfp_text:
            issues.append({
                'finding_id': finding.get('id'),
                'issue': 'Quoted text not found in RFP',
                'quoted': quoted_text,
                'severity': 'HIGH - Possible hallucination'
            })

    return issues

def enforce_citation_requirements(output_json):
    """
    Verify every finding has location info
    """
    for finding in output_json.get('risks', []) or output_json.get('barriers', []):
        if not finding.get('location') or not finding.get('exact_quote'):
            raise ValueError(f"Finding {finding.get('id')} missing required location/quote")
```

---

## IMPLEMENTATION WORKFLOW

### Full Analysis Pipeline

```python
# Pseudo-code for complete RFP analysis

def analyze_rfp(rfp_document):
    """
    Complete RFP analysis using all 4 categories
    """

    # 1. Extract sections
    sections = extract_sections(rfp_document)

    # 2. Run Category 1: Identified Risks
    risks_prompt = build_risks_prompt(sections['all'])
    risks_output = call_llm(RISKS_SYSTEM_PROMPT, risks_prompt)
    risks_validated = validate_output(risks_output, 'risks')
    risks_flagged = check_for_hallucinations(risks_output, rfp_document)

    # 3. Run Category 2: Small Business Accessibility
    accessibility_prompt = build_accessibility_prompt(
        sections['insurance'],
        sections['qualifications'],
        sections['small_business_policy'],
        estimated_contract_value=extract_value(rfp_document)
    )
    accessibility_output = call_llm(ACCESSIBILITY_SYSTEM_PROMPT, accessibility_prompt)
    accessibility_validated = validate_output(accessibility_output, 'accessibility')

    # 4. Run Category 3: Clarifying Questions
    # Note: Uses risks as input (questions generated from ambiguities)
    questions_prompt = build_questions_prompt(sections['all'], risks_output['risks'])
    questions_output = call_llm(QUESTIONS_SYSTEM_PROMPT, questions_prompt)
    questions_validated = validate_output(questions_output, 'questions')

    # 5. Run Category 4: Subcontracting Opportunities
    subcontracting_prompt = build_subcontracting_prompt(
        sections['scope'],
        sections['subcontracting_policy'],
        estimated_contract_value=extract_value(rfp_document)
    )
    subcontracting_output = call_llm(SUBCONTRACTING_SYSTEM_PROMPT, subcontracting_prompt)
    subcontracting_validated = validate_output(subcontracting_output, 'subcontracting')

    # 6. Flag low-confidence findings
    all_findings = (
        risks_output['risks'] +
        accessibility_output['barriers'] +
        questions_output['questions'] +
        subcontracting_output['opportunities']
    )
    flagged_for_review = handle_low_confidence(all_findings)

    # 7. Generate summary report
    return {
        'risks': risks_output,
        'accessibility': accessibility_output,
        'questions': questions_output,
        'subcontracting': subcontracting_output,
        'validation_passed': all([
            risks_validated,
            accessibility_validated,
            questions_validated,
            subcontracting_validated
        ]),
        'flagged_items': flagged_for_review,
        'hallucination_issues': risks_flagged
    }
```

---

## SUMMARY OF ANTI-HALLUCINATION TECHNIQUES IMPLEMENTED

| **Technique** | **Implementation** | **Category Coverage** |
|---|---|---|
| **Structured JSON Output** | Strict schemas with validation | All 4 categories |
| **Required Citations** | exact_quote + location mandatory | Risks, Accessibility, Questions |
| **Chain-of-Thought** | reasoning field required, step-by-step | All 4 categories |
| **Confidence Scoring** | 0-100 score per finding, <70 flagged | All 4 categories |
| **Self-Critique** | Review checklist applied before output | All 4 categories |
| **Few-Shot Examples** | 2-3 examples with reasoning | All 4 categories |
| **Explicit Constraints** | DO/DON'T lists in system prompts | All 4 categories |
| **Grounding in Evidence** | Must quote exact RFP text | Risks, Accessibility, Questions |
| **Industry Standards** | Specific benchmarks provided (insurance) | Accessibility |
| **Hallucination Detection** | Post-processing verification of quotes | All 4 categories |
| **Schema Validation** | JSON structure enforced | All 4 categories |


