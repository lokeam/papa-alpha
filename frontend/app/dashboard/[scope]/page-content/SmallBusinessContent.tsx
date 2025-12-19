

import { useState } from 'react';

// Components
import { AccessibilitySidePanel } from '@/app/dashboard/[scope]/side-detail-panels/AccessibilitySidePanel';

// Types
import { AnalysisResults } from '@/app/lib/types';
import { AccessibilityScore } from '@/app/dashboard/[scope]/types';

// ============================================================================
// SMALL BUSINESS ACCESSIBILITY CONTENT
// ============================================================================
/**
 * Displays WCAG compliance scores and accessibility issues
 * Uses custom layout (not PriorityListLayout) due to unique scoring UI
 * Shows: Overall grade, category scores, critical issues by priority
 */
export function SmallBusinessContent({ analysis }: { analysis: AnalysisResults }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Extract accessibility data from analysis
  const accessibilityData = analysis.accessibility?.accessibility_analysis;
  const finalScore = accessibilityData?.final_score || 0;
  const score: AccessibilityScore = {
    overallScore: finalScore,
    maxScore: 10,
    grade: finalScore >= 9 ? 'A' : finalScore >= 7 ? 'B' : finalScore >= 5 ? 'C' : finalScore >= 3 ? 'D' : 'F',
    categories: [],
    summary: accessibilityData?.rating || 'Unknown',
    criticalIssues: analysis.accessibility?.barriers?.map(b => b.exact_quote) || []
  };

  return (
    <div className="max-w-4xl mx-auto">
      <AccessibilitySidePanel
        score={score}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
      />
    </div>
  );
}