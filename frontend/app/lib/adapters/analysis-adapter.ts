/**
 * Analysis Data Adapters
 * Transform backend analysis results for frontend UI consumption
 */

import type {
  AnalysisResults,
  DashboardSummary,
  RiskSeverity,
  QuestionUrgency,
  BarrierSeverity,
  UIPriority,
} from '@/app/lib/types';

// ============================================================================
// SEVERITY/URGENCY TO UI PRIORITY MAPPING
// ============================================================================

/**
 * Convert backend severity/urgency to lowercase UI priority
 */
export function mapToUIPriority(
  level: RiskSeverity | QuestionUrgency | BarrierSeverity
): UIPriority {
  return level.toLowerCase() as UIPriority;
}

// ============================================================================
// DASHBOARD SUMMARY EXTRACTION
// ============================================================================

/**
 * Extract dashboard summary metrics from analysis results
 */
export function extractDashboardSummary(
  analysis: AnalysisResults
): DashboardSummary {
  // Risks
  const totalRisks = analysis.risks?.analysis_summary.total_risks_found ?? 0;
  const highRisks = analysis.risks?.analysis_summary.high_severity ?? 0;
  const mediumRisks = analysis.risks?.analysis_summary.medium_severity ?? 0;
  const lowRisks = analysis.risks?.analysis_summary.low_severity ?? 0;

  // Questions
  const totalQuestions = analysis.questions?.questions_predicted ?? 0;
  const highUrgencyQuestions = analysis.questions?.urgency_breakdown.high ?? 0;
  const mediumUrgencyQuestions = analysis.questions?.urgency_breakdown.medium ?? 0;
  const lowUrgencyQuestions = analysis.questions?.urgency_breakdown.low ?? 0;

  // Subcontracting
  const totalOpportunities =
    analysis.subcontracting?.subcontracting_analysis.opportunities_found ?? 0;

  // Accessibility
  const accessibilityScore =
    analysis.accessibility?.accessibility_analysis.final_score ?? 0;
  const accessibilityRating =
    analysis.accessibility?.accessibility_analysis.rating ?? 'Unknown';

  // Action items (HIGH priority across all categories)
  const actionItemsCount = highRisks + highUrgencyQuestions;

  return {
    totalRisks,
    highRisks,
    mediumRisks,
    lowRisks,
    totalQuestions,
    highUrgencyQuestions,
    mediumUrgencyQuestions,
    lowUrgencyQuestions,
    totalOpportunities,
    accessibilityScore,
    accessibilityRating,
    actionItemsCount,
  };
}

// ============================================================================
// DYNAMIC NEXT STEPS GENERATION
// ============================================================================

/**
 * Generate dynamic next steps based on analysis results
 */
export function generateNextSteps(analysis: AnalysisResults): string[] {
  const steps: string[] = [];
  const summary = extractDashboardSummary(analysis);

  // High priority risks
  if (summary.highRisks > 0) {
    steps.push(
      `Review ${summary.highRisks} HIGH priority risk${summary.highRisks > 1 ? 's' : ''} first to prevent bid protests`
    );
  }

  // Accessibility score
  if (summary.accessibilityScore < 5) {
    steps.push(
      `Address small business accessibility score (currently ${summary.accessibilityScore}/10)`
    );
  } else if (summary.accessibilityScore < 7) {
    steps.push(
      `Improve small business accessibility score (currently ${summary.accessibilityScore}/10)`
    );
  }

  // High urgency questions
  if (summary.highUrgencyQuestions > 0) {
    steps.push(
      `Prepare answers for ${summary.highUrgencyQuestions} HIGH urgency question${summary.highUrgencyQuestions > 1 ? 's' : ''} vendors will ask`
    );
  }

  // Subcontracting opportunities
  if (summary.totalOpportunities > 0) {
    steps.push(
      `Review ${summary.totalOpportunities} subcontracting opportunit${summary.totalOpportunities > 1 ? 'ies' : 'y'} to maximize small business participation`
    );
  }

  // Always include download option
  steps.push('Download full compliance report for stakeholder review');

  return steps;
}

// ============================================================================
// ACTION ITEMS GENERATION
// ============================================================================

export interface ActionItem {
  icon: 'warning' | 'bulb';
  text: string;
}

/**
 * Generate action items summary for dashboard overview
 */
export function generateActionItems(analysis: AnalysisResults): ActionItem[] {
  const summary = extractDashboardSummary(analysis);
  const items: ActionItem[] = [];

  // High priority items (risks + questions)
  if (summary.actionItemsCount > 0) {
    items.push({
      icon: 'warning',
      text: `${summary.actionItemsCount} item${summary.actionItemsCount > 1 ? 's' : ''} require immediate action (HIGH priority)`,
    });
  }

  // Medium/Low priority items
  const recommendationCount =
    summary.mediumRisks +
    summary.lowRisks +
    summary.mediumUrgencyQuestions +
    summary.lowUrgencyQuestions;

  if (recommendationCount > 0) {
    items.push({
      icon: 'bulb',
      text: `${recommendationCount} item${recommendationCount > 1 ? 's are' : ' is'} recommendations (MEDIUM/LOW priority)`,
    });
  }

  return items;
}

// ============================================================================
// BADGE GENERATION
// ============================================================================

export type BadgeVariant = 'warning' | 'action' | 'success' | 'info';

export interface Badge {
  text: string;
  variant: BadgeVariant;
}

/**
 * Generate badge for accessibility score
 */
export function getAccessibilityBadge(score: number): Badge {
  if (score >= 8) {
    return { text: 'Excellent', variant: 'success' };
  } else if (score >= 6) {
    return { text: 'Good', variant: 'info' };
  } else if (score >= 4) {
    return { text: 'Needs improvement', variant: 'warning' };
  } else {
    return { text: 'Critical issues', variant: 'action' };
  }
}

/**
 * Generate badge for risk count
 */
export function getRisksBadge(highCount: number): Badge {
  if (highCount === 0) {
    return { text: 'No critical issues', variant: 'success' };
  } else if (highCount <= 3) {
    return { text: 'Review recommended', variant: 'warning' };
  } else {
    return { text: 'Action required', variant: 'action' };
  }
}

// ============================================================================
// LOW CONFIDENCE FILTERING
// ============================================================================

/**
 * Check if an item has low confidence (below threshold)
 */
export function isLowConfidence(
  confidence: number,
  threshold: number = 70
): boolean {
  return confidence < threshold;
}

/**
 * Get all low confidence items from analysis
 */
export function getLowConfidenceItems(analysis: AnalysisResults) {
  const items: Array<{ id: string; type: string; confidence: number }> = [];

  // Risks
  analysis.risks?.risks.forEach((risk) => {
    if (isLowConfidence(risk.confidence)) {
      items.push({ id: risk.id, type: 'Risk', confidence: risk.confidence });
    }
  });

  // Accessibility barriers
  analysis.accessibility?.barriers.forEach((barrier) => {
    if (isLowConfidence(barrier.confidence)) {
      items.push({
        id: barrier.id,
        type: 'Accessibility Barrier',
        confidence: barrier.confidence,
      });
    }
  });

  // Questions
  analysis.questions?.questions.forEach((question) => {
    if (isLowConfidence(question.confidence)) {
      items.push({
        id: question.id,
        type: 'Question',
        confidence: question.confidence,
      });
    }
  });

  // Subcontracting opportunities
  analysis.subcontracting?.opportunities.forEach((opp) => {
    if (isLowConfidence(opp.confidence)) {
      items.push({
        id: opp.id,
        type: 'Subcontracting Opportunity',
        confidence: opp.confidence,
      });
    }
  });

  return items;
}

// ============================================================================
// SUMMARY TEXT GENERATION
// ============================================================================

/**
 * Generate summary text for dashboard overview
 */
export function generateSummaryText(analysis: AnalysisResults): string {
  const summary = extractDashboardSummary(analysis);
  const totalItems =
    summary.totalRisks + summary.totalQuestions + summary.totalOpportunities;

  const parts: string[] = [];

  if (summary.totalRisks > 0) {
    parts.push(`${summary.totalRisks} risk${summary.totalRisks > 1 ? 's' : ''}`);
  }

  if (summary.totalQuestions > 0) {
    parts.push(
      `${summary.totalQuestions} question${summary.totalQuestions > 1 ? 's' : ''}`
    );
  }

  if (summary.totalOpportunities > 0) {
    parts.push(
      `${summary.totalOpportunities} opportunit${summary.totalOpportunities > 1 ? 'ies' : 'y'}`
    );
  }

  const itemsList = parts.join(', ');

  return `Your RFP has been analyzed for compliance and quality issues. We identified ${totalItems} item${totalItems > 1 ? 's' : ''} that need attention: ${itemsList}.`;
}
