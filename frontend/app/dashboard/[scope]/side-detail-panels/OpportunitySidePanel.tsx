'use client';

import { useTheme } from 'next-themes';

// Components
import { PriorityBadge } from '../components/PriorityBadge';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { ImpactAssessment } from '../components/ImpactAssessment';
import { ActionButtons } from '../components/ActionButtons';
import { Tooltip } from '@/components/tooltip/ToolTip';

// Types
import { Opportunity } from "../types";

// Icons
import { ChartBarPopularIcon } from '@/components/ui/icons/ChartBarPopularIcon';
import { BulbIcon } from '@/components/ui/icons/BulbIcon';
import { AskteriskIcon } from '@/components/ui/icons/AskteriskIcon';
import { SparklesIcon } from '@/components/ui/icons/SparklesIcon';
import { HandShakeIcon } from '@/components/ui/icons/HandShakeIcon';
import { CopyIcon } from '@/components/ui/icons/CopyIcon';

export function OpportunitySidePanel({
  opportunity,
  expandedSections,
  onToggleSection,
}: {
  opportunity: Opportunity;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  return (
    <div className="space-y-6">
      <PriorityBadge priority={opportunity.priority} />

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {opportunity.title}
        </h2>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <AskteriskIcon className="w-5 h-5 text-red-500" /> {opportunity.section}, Page {opportunity.page}
        </p>
      </div>

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <BulbIcon className="w-7 h-7 text-yellow-500" /> Opportunity:
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {opportunity.description}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <SparklesIcon className="w-7 h-7 text-yellow-500" /> Benefits:
        </h3>
        <ul className="space-y-2">
          {opportunity.benefits.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
              <HandShakeIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-1" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {opportunity.naicsCode && (
        <div className="p-4 border rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff', borderColor: theme === 'dark' ? '#1e3a8a' : '#bfdbfe' }}>
          <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-2">
            <ChartBarPopularIcon className="w-7 h-7 text-blue-500" /> Recommended NAICS Code:
          </div>
          <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
            {opportunity.naicsCode}
          </div>
        </div>
      )}

      <CollapsibleSection
        title="Suggested Language:"
        isExpanded={expandedSections.suggestedLanguage || false}
        onToggle={() => onToggleSection('suggestedLanguage')}
        titleColor="text-green-700 dark:text-green-400"
      >
        <div className="p-4 rounded border text-sm whitespace-pre-wrap text-foreground" style={{ backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5', borderColor: 'hsl(var(--card-border))' }}>
          {opportunity.suggestedLanguage}
        </div>
        <Tooltip content="Feature not yet available" side="top">
          <button
            disabled
            aria-disabled="true"
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium transition-colors cursor-not-allowed opacity-60"
          >
            <CopyIcon className="w-5 h-5 mr-2 text-white" /> Copy This Text
          </button>
        </Tooltip>
      </CollapsibleSection>

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      <ImpactAssessment
        metrics={[
          {
            label: 'Small Business Access',
            value: opportunity.impact.smallBusinessAccess,
            highlight: opportunity.impact.smallBusinessAccess === 'high'
          },
          {
            label: 'Competition Increase',
            value: opportunity.impact.competitionIncrease
          },
          {
            label: 'Potential Cost Savings',
            value: opportunity.impact.costSavings
          }
        ]}
      />

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      <Tooltip content="Feature not yet available" side="top">
        <div className="grid grid-cols-1 gap-2">
          <ActionButtons
            actions={[
              {
                label: 'Copy Suggested Language',
                icon: 'copy',
                variant: 'primary',
              },
              {
                label: 'Mark as Implemented',
                icon: 'check',
                variant: 'success',
              },
              {
                label: 'Generate Alternative',
                icon: 'sparkles',
                variant: 'secondary',
              },
              {
                label: 'Add Note',
                icon: 'pencil',
                variant: 'secondary',
              },
              {
                label: 'Next Opportunity →',
                icon: 'arrow',
                variant: 'secondary',
              }
            ]}
          />
        </div>
      </Tooltip>
    </div>
  );
}