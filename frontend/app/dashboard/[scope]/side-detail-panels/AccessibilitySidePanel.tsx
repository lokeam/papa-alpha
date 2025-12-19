'use client';

import { useTheme } from 'next-themes';

// Types
import { AccessibilityScore } from "@/app/dashboard/[scope]/types";

// Icons
import { WarningIcon } from '@/components/ui/icons/WarningIcon';
import { XIcon } from '@/components/ui/icons/XIcon';
import { ChartBarPopularIcon } from '@/components/ui/icons/ChartBarPopularIcon';
import { CircleCheckIcon } from '@/components/ui/icons/CircleCheckIcon';

// Components
import { CollapsibleSection } from '@/app/dashboard/[scope]/components/CollapsibleSection';
import { ActionButtons } from '@/app/dashboard/[scope]/components/ActionButtons';
import { Tooltip } from '@/components/tooltip/ToolTip';
import { ClipboardPenIcon } from '@/components/ui/icons/ClipboardPenIcon';


export function AccessibilitySidePanel({
  score,
  expandedSections,
  onToggleSection
}: {
  score: AccessibilityScore;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
}) {
  const { theme } = useTheme();

  const getGradeColors = (grade: 'A' | 'B' | 'C' | 'D' | 'F') => {
    const colorMap = {
      'A': { text: theme === 'dark' ? '#4ade80' : '#15803d', bg: theme === 'dark' ? '#14532d' : '#f0fdf4' },
      'B': { text: theme === 'dark' ? '#60a5fa' : '#1e40af', bg: theme === 'dark' ? '#1e3a8a' : '#eff6ff' },
      'C': { text: theme === 'dark' ? '#fbbf24' : '#b45309', bg: theme === 'dark' ? '#78350f' : '#fffbeb' },
      'D': { text: theme === 'dark' ? '#fb923c' : '#c2410c', bg: theme === 'dark' ? '#7c2d12' : '#fff7ed' },
      'F': { text: theme === 'dark' ? '#f87171' : '#991b1b', bg: theme === 'dark' ? '#7f1d1d' : '#fef2f2' }
    };
    return colorMap[grade];
  };

  const gradeColors = getGradeColors(score.grade);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-block px-6 py-3 rounded-full text-3xl font-bold" style={{ color: gradeColors.text, backgroundColor: gradeColors.bg }}>
          {score.overallScore}/{score.maxScore}
        </div>
        <div className="mt-2 text-xl font-semibold" style={{ color: gradeColors.text }}>
          Grade: {score.grade}
        </div>
      </div>

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <ChartBarPopularIcon className="w-7 h-7 text-blue-500" /> Summary:
        </h3>
        <p className="text-foreground leading-relaxed">
          {score.summary}
        </p>
      </div>

      {score.criticalIssues.length > 0 && (
        <div
          className="p-4 border rounded-lg"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(127, 29, 29, 0.2)' : '#fef2f2',
            borderColor: theme === 'dark' ? '#7f1d1d' : '#fca5a5'
          }}
        >
          <h3 className="text-lg font-semibold mb-3" style={{ color: theme === 'dark' ? '#fca5a5' : '#7f1d1d' }}>
            <WarningIcon className="w-6 h-6 text-red-500" /> Critical Issues:
          </h3>
          <ul className="space-y-2">
            {score.criticalIssues.map((issue, idx) => (
              <li key={idx} className="flex items-start gap-2" style={{ color: theme === 'dark' ? '#fca5a5' : '#7f1d1d' }}>
                <span className="mt-1">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <ClipboardPenIcon className="w-7 h-7 text-blue-500" /> Category Breakdown:
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
                    <h4 className="font-semibold text-foreground mb-2">
                      <XIcon className="w-7 h-7 text-red-500" /> Issues Found:
                    </h4>
                    <ul className="space-y-1">
                      {category.issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {category.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      <CircleCheckIcon className="w-7 h-7 text-green-500" /> Recommendations:
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

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />
      <Tooltip content="Buttons disabled for demo purposes" side="top">
          <ActionButtons
            actions={[
              {
                label: 'Download Full Report',
                icon: 'file',
                variant: 'primary',
                onClick: () => console.log('Download')
              },
              {
                label: 'Export to PDF',
                icon: 'download',
                variant: 'secondary',
                onClick: () => console.log('Export')
              },
              {
                label: 'Share Analysis',
                icon: 'share',
                variant: 'secondary',
                onClick: () => console.log('Share')
              }
            ]}
          />
      </Tooltip>
    </div>
  );
}
