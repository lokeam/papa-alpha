/**
 * Scope Detail View Adapters
 * Transform backend analysis items for [scope] detail pages
 *
 * Used by: /app/dashboard/[scope]/page.tsx
 * - IdentifiedRisksContent
 * - ClarifyingQuestionsContent
 * - SubcontractingContent
 */

import type {
  Risk as BackendRisk,
  PredictedQuestion,
  SubcontractingOpportunity,
} from '@/app/lib/types';

import type {
  Risk as ComponentRisk,
  Question as ComponentQuestion,
  Opportunity as ComponentOpportunity,
} from '@/app/dashboard/[scope]/types';

// ============================================================================
// RISK ADAPTER
// ============================================================================

/**
 * Transform backend Risk to component-ready format for detail view
 */
export function adaptRiskToComponent(risk: BackendRisk): ComponentRisk {
  return {
    id: risk.id,
    title: risk.issue_description.substring(0, 100) + '...',
    section: risk.location.section,
    page: parseInt(risk.location.page) || 0,
    preview: risk.exact_quote,
    priority: risk.severity.toLowerCase() as 'high' | 'medium' | 'low',
    problem: risk.issue_description,
    whyItMatters: [risk.reasoning, risk.impact_if_unresolved],
    suggestedFix: risk.suggested_fix,
    impact: {
      complianceRisk: risk.severity.toLowerCase() as 'high' | 'medium' | 'low',
      effortToFix: 'Medium',
      protestLikelihood: risk.severity === 'HIGH' ? 'High' : 'Low',
    },
  };
}

// ============================================================================
// QUESTION ADAPTER
// ============================================================================

/**
 * Transform backend Question to component-ready format for detail view
 */
export function adaptQuestionToComponent(
  q: PredictedQuestion
): ComponentQuestion {
  return {
    id: q.id,
    title: q.predicted_question,
    section: q.triggered_by.location,
    page: 0,
    preview: q.triggered_by.exact_quote,
    priority: q.urgency.toLowerCase() as 'high' | 'medium' | 'low',
    question: q.predicted_question,
    context: q.triggered_by.exact_quote,
    whyAsking: q.confusion_analysis.possible_interpretations,
    suggestedApproach: q.suggested_fix || '',
    impact: {
      clarityImprovement: q.urgency.toLowerCase() as 'high' | 'medium' | 'low',
      vendorConfusion: q.confusion_analysis.why_confusing,
      responseQuality: 'Medium',
    },
  };
}

// ============================================================================
// OPPORTUNITY ADAPTER
// ============================================================================

/**
 * Transform backend Opportunity to component-ready format for detail view
 */
export function adaptOpportunityToComponent(
  opp: SubcontractingOpportunity
): ComponentOpportunity {
  return {
    id: opp.id,
    title: opp.area.substring(0, 100) + (opp.area.length > 100 ? '...' : ''),
    section: opp.location,
    page: 0,
    preview: opp.rfp_text,
    priority: 'medium',
    description: opp.reasoning,
    benefits: opp.suitable_business_types,
    suggestedLanguage: opp.rfp_text,
    naicsCode: opp.naics_code,
    impact: {
      smallBusinessAccess: 'high',
      competitionIncrease: 'Medium',
      costSavings: opp.estimated_value,
    },
  };
}
