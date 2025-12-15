'use client';

import { AccessibilityScore } from "../types";
import { CollapsibleSection } from '../components/CollapsibleSection';
import { ActionButtons } from '../components/ActionButtons';

export function AccessibilityDetailContent({
  score,
  expandedSections,
  onToggleSection
}: {
  score: AccessibilityScore;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
}) {
  const gradeColors = {
    'A': 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950',
    'B': 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950',
    'C': 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950',
    'D': 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950',
    'F': 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950'
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`inline-block px-6 py-3 rounded-full text-3xl font-bold ${gradeColors[score.grade]}`}>
          {score.overallScore}/{score.maxScore}
        </div>
        <div className={`mt-2 text-xl font-semibold ${gradeColors[score.grade]}`}>
          Grade: {score.grade}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
          📊 Summary:
        </h3>
        <p className="text-gray-700 dark:text-zinc-300 leading-relaxed">
          {score.summary}
        </p>
      </div>

      {score.criticalIssues.length > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
          <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-300 mb-3">
            ⚠️ Critical Issues:
          </h3>
          <ul className="space-y-2">
            {score.criticalIssues.map((issue, idx) => (
              <li key={idx} className="flex items-start gap-2 text-rose-800 dark:text-rose-300">
                <span className="mt-1">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
          📋 Category Breakdown:
        </h3>
        <div className="space-y-4">
          {score.categories.map((category, idx) => (
            <CollapsibleSection
              key={idx}
              title={`${category.name} (${category.score}/${category.maxScore})`}
              isExpanded={expandedSections[`category-${idx}`] || false}
              onToggle={() => onToggleSection(`category-${idx}`)}
              titleColor={
                category.score / category.maxScore >= 0.8
                  ? 'text-green-700 dark:text-green-400'
                  : category.score / category.maxScore >= 0.6
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-rose-700 dark:text-rose-400'
              }
            >
              <div className="space-y-4">
                {category.issues.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      ❌ Issues Found:
                    </h4>
                    <ul className="space-y-1">
                      {category.issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-zinc-300">
                          <span className="text-rose-600 dark:text-rose-400 mt-1">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {category.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      ✅ Recommendations:
                    </h4>
                    <ul className="space-y-1">
                      {category.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-zinc-300">
                          <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      <ActionButtons
        actions={[
          {
            label: 'Download Full Report',
            icon: '📄',
            variant: 'primary',
            onClick: () => console.log('Download')
          },
          {
            label: 'Export to PDF',
            icon: '📋',
            variant: 'secondary',
            onClick: () => console.log('Export')
          },
          {
            label: 'Share Analysis',
            icon: '📤',
            variant: 'secondary',
            onClick: () => console.log('Share')
          }
        ]}
      />
    </div>
  );
}