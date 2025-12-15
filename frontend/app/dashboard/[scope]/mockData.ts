import type { Risk, Question, Opportunity, AccessibilityScore } from './types';

// ============================================================================
// IDENTIFIED RISKS - Mock Data
// ============================================================================

export const mockRisks: Risk[] = [
  {
    id: '1',
    title: 'Evaluation criteria not measurable',
    section: 'Section M - Evaluation Factors',
    page: 52,
    preview: 'Uses subjective terms like "sufficient experience" that violate FAR 15.305 requirements',
    priority: 'high',
    problem: 'Your RFP states vendors must demonstrate "sufficient experience" and have "appropriate qualifications." These terms are subjective and non-measurable, violating FAR 15.305 requirements for objective evaluation.',
    whyItMatters: [
      'Losing vendors can protest claiming subjective evaluation',
      'Evaluation team will struggle to score proposals consistently',
      'May be challenged as arbitrary',
      'Could delay contract award by 2-4 weeks requiring RFP re-issue'
    ],
    suggestedFix: 'Replace the vague language in Section M, paragraph 3.2.1 with:\n\n"Offerors must demonstrate:\n\nTechnical Qualifications (30 pts):\n• Minimum 5 years experience delivering similar IT services to federal agencies\n• At least 3 completed contracts over $1M value in past 5 years\n• Relevant certifications: CMMI Level 3 or ISO 27001\n\nPast Performance (25 pts):\n• Minimum 3 references from similar federal IT projects\n• Average CPARS rating of \'Satisfactory\' or higher\n\nScoring: Points awarded based on:\n• Years of experience (max 10 pts)\n• Contract values (max 15 pts)\n• Certifications (max 5 pts)\n• Reference quality (max 25 pts)"',
    farCitation: 'FAR 15.305 - Proposal Evaluation\n\n"(a) Proposal evaluation is an assessment of the proposal and the offeror\'s ability to perform the prospective contract successfully... (2) The evaluation factors must: (i) Represent the key areas of importance and emphasis to be considered in the source selection decision; and (ii) Support meaningful comparison and discrimination between competing proposals."',
    impact: {
      complianceRisk: 'high',
      effortToFix: 'MEDIUM (15 minutes)',
      protestLikelihood: '35% if not fixed'
    }
  },
  {
    id: '2',
    title: 'Requirements exclude small businesses',
    section: 'Section C - Statement of Work',
    page: 18,
    preview: 'Minimum employee count of 500 eliminates 99% of small businesses from consideration',
    priority: 'high',
    problem: 'The RFP requires contractors to have a minimum of 500 employees. This requirement eliminates virtually all small businesses from competing.',
    whyItMatters: [
      'Violates small business participation goals',
      'May trigger SBA review and protest',
      'Reduces competition and increases costs',
      'Could require justification for large business set-aside'
    ],
    suggestedFix: 'Remove the 500-employee requirement or replace with capability-based requirements such as:\n\n"Contractor must demonstrate capacity to:\n• Provide 24/7 support coverage\n• Maintain response times under 2 hours\n• Support minimum of 1,000 concurrent users\n\nNote: Small businesses may meet these requirements through teaming arrangements or subcontracting."',
    impact: {
      complianceRisk: 'high',
      effortToFix: 'LOW (5 minutes)',
      protestLikelihood: '45% if not fixed'
    }
  },
  {
    id: '3',
    title: 'Ambiguous language: "timely updates"',
    section: 'Section C - Performance Requirements',
    page: 12,
    preview: 'Vague temporal requirements will cause vendor confusion',
    priority: 'high',
    problem: 'The RFP requires "timely updates" without defining what "timely" means. This creates ambiguity in performance requirements.',
    whyItMatters: [
      'Vendors will interpret differently in proposals',
      'Cannot objectively evaluate compliance',
      'May lead to performance disputes after award',
      'Weakens government\'s position in disputes'
    ],
    suggestedFix: 'Replace "timely updates" with specific timeframes:\n\n"Status reports must be delivered:\n• Weekly reports: Every Friday by 5:00 PM ET\n• Critical incidents: Within 2 hours of detection\n• Monthly summaries: First business day of each month\n• Ad-hoc updates: Within 24 hours of request"',
    impact: {
      complianceRisk: 'high',
      effortToFix: 'LOW (5 minutes)',
      protestLikelihood: '20% if not fixed'
    }
  }
];

// ============================================================================
// CLARIFYING QUESTIONS - Mock Data
// ============================================================================

export const mockQuestions: Question[] = [
  {
    id: '1',
    title: 'Unclear deliverable timeline',
    section: 'Section F - Deliverables',
    page: 28,
    preview: 'Monthly reports due "at end of month" - does this mean last business day or calendar day?',
    priority: 'high',
    question: 'Section F.2.1 states monthly status reports are due "at the end of each month." Does this mean the last calendar day, last business day, or a specific date (e.g., 30th)?',
    context: 'The RFP requires monthly status reports but doesn\'t specify the exact due date. This ambiguity could lead to confusion and potential compliance issues.',
    whyAsking: [
      'Vendors need clear deadlines to plan resource allocation',
      'Ambiguous dates can lead to late submissions and disputes',
      'Government needs consistent reporting for program management',
      'Clarification prevents need for amendments after award'
    ],
    suggestedApproach: 'Recommend adding to Section F.2.1:\n\n"Monthly Status Reports shall be submitted no later than the 5th business day of the following month. For example, the January report is due by the 5th business day of February."',
    impact: {
      clarityImprovement: 'high',
      vendorConfusion: 'Moderate - will cause questions during Q&A',
      responseQuality: 'May result in varied assumptions in proposals'
    }
  },
  {
    id: '2',
    title: 'Conflicting security requirements',
    section: 'Section C - Security',
    page: 45,
    preview: 'Section C.4 requires FedRAMP Moderate but Section L requires FedRAMP High certification',
    priority: 'high',
    question: 'Section C.4.2 specifies FedRAMP Moderate authorization, but Section L.3.1 requires vendors to demonstrate FedRAMP High certification. Which is the actual requirement?',
    context: 'There is a direct conflict between technical requirements and proposal instructions regarding FedRAMP authorization level.',
    whyAsking: [
      'FedRAMP High is significantly more expensive and time-consuming',
      'Vendors cannot bid if they don\'t know the correct requirement',
      'This conflict will generate multiple questions during Q&A period',
      'May require RFP amendment if not clarified'
    ],
    suggestedApproach: 'Recommend clarifying the actual requirement and updating both sections consistently. If FedRAMP Moderate is sufficient, update Section L.3.1. If High is required, update Section C.4.2 and justify the need.',
    impact: {
      clarityImprovement: 'high',
      vendorConfusion: 'High - direct conflict will stop vendors from bidding',
      responseQuality: 'Critical - may eliminate qualified vendors'
    }
  }
];

// ============================================================================
// SUBCONTRACTING OPPORTUNITIES - Mock Data
// ============================================================================

export const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    title: 'Help Desk Support Services',
    section: 'Section C.3 - Technical Support',
    page: 22,
    preview: 'Tier 1 and Tier 2 help desk support could be set aside for small business subcontractors',
    priority: 'high',
    description: 'The RFP requires 24/7 help desk support for 1,000+ users. This work package is well-suited for small business subcontractors and could be carved out as a specific subcontracting opportunity.',
    benefits: [
      'Increases small business participation by 15-20%',
      'Provides clear pathway for SDVOSB and WOSB firms',
      'Reduces prime contractor costs through competitive subcontracting',
      'Meets agency small business goals'
    ],
    suggestedLanguage: 'Add to Section C.3:\n\n"Help Desk Support Subcontracting Opportunity:\n\nThe contractor shall subcontract help desk support services (Tier 1 and Tier 2) to qualified small business concerns. Minimum subcontracting goal: 20% of total help desk labor hours.\n\nQualified small businesses include:\n• Service-Disabled Veteran-Owned Small Business (SDVOSB)\n• Women-Owned Small Business (WOSB)\n• HUBZone Small Business\n• 8(a) Business Development participants\n\nSubcontractor shall:\n• Provide 24/7 coverage (rotating shifts)\n• Maintain average response time under 2 minutes\n• Achieve 90% first-call resolution rate\n• Use government-furnished ticketing system"',
    naicsCode: '541519 - Other Computer Related Services',
    impact: {
      smallBusinessAccess: 'high',
      competitionIncrease: '+25% more qualified bidders',
      costSavings: 'Estimated 10-15% cost reduction'
    }
  },
  {
    id: '2',
    title: 'Documentation and Training Materials',
    section: 'Section C.5 - Training',
    page: 34,
    preview: 'Technical writing and training development is ideal for small business subcontracting',
    priority: 'high',
    description: 'The requirement for user guides, training materials, and documentation could be structured as a small business subcontracting opportunity.',
    benefits: [
      'Supports small business technical writing firms',
      'Allows prime to focus on core technical delivery',
      'Provides flexibility in documentation updates',
      'Creates opportunities for veteran-owned businesses'
    ],
    suggestedLanguage: 'Add to Section C.5:\n\n"Training and Documentation Subcontracting:\n\nThe contractor shall subcontract development of training materials and technical documentation to small business concerns.\n\nScope includes:\n• User guides and quick reference cards\n• Video training modules (minimum 10 hours)\n• Administrator documentation\n• Standard Operating Procedures (SOPs)\n• Quarterly updates to all materials\n\nPreferred small business categories:\n• SDVOSB or VOSB\n• WOSB\n• HUBZone\n\nDeliverables shall be Section 508 compliant and provided in accessible formats."',
    naicsCode: '541430 - Graphic Design Services',
    impact: {
      smallBusinessAccess: 'high',
      competitionIncrease: '+30% more proposals expected',
      costSavings: 'Estimated 12% cost reduction'
    }
  }
];

// ============================================================================
// SMALL BUSINESS ACCESSIBILITY - Mock Data
// ============================================================================

export const mockAccessibilityScore: AccessibilityScore = {
  overallScore: 3,
  maxScore: 10,
  grade: 'D',
  summary: 'Your RFP has significant barriers to small business participation. Several requirements unnecessarily restrict competition and may violate small business participation goals.',
  criticalIssues: [
    'Minimum employee count of 500 eliminates 99% of small businesses',
    'Past performance requirements favor large incumbents',
    'No small business set-aside or subcontracting plan'
  ],
  categories: [
    {
      name: 'Size Standards',
      score: 1,
      maxScore: 3,
      issues: [
        'Employee count requirement (500+) far exceeds NAICS size standard',
        'Revenue requirements exclude qualified small businesses'
      ],
      recommendations: [
        'Replace employee count with capability-based requirements',
        'Align requirements with NAICS 541512 size standard (annual receipts of $34M)'
      ]
    },
    {
      name: 'Past Performance',
      score: 1,
      maxScore: 2,
      issues: [
        'Requires 5 similar contracts over $10M (favors large businesses)',
        'No consideration for teaming or joint ventures'
      ],
      recommendations: [
        'Reduce to 3 contracts of any size with similar scope',
        'Allow small businesses to demonstrate capability through teaming'
      ]
    },
    {
      name: 'Set-Aside Opportunities',
      score: 0,
      maxScore: 3,
      issues: [
        'No small business set-aside despite suitable scope',
        'No subcontracting plan requirements',
        'Missing small business participation goals'
      ],
      recommendations: [
        'Consider total or partial small business set-aside',
        'Add subcontracting plan with 30% small business goal',
        'Include specific goals for women-owned, veteran-owned, and HUBZone businesses'
      ]
    },
    {
      name: 'Technical Requirements',
      score: 1,
      maxScore: 2,
      issues: [
        'Certification requirements favor large businesses',
        'Geographic restrictions limit small business access'
      ],
      recommendations: [
        'Accept equivalent certifications or allow time to obtain',
        'Remove or justify geographic restrictions'
      ]
    }
  ]
};