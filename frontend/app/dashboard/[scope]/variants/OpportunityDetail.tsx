'use client';

import { Opportunity } from "../types";
import { PriorityBadge } from '../components/PriorityBadge';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { ImpactAssessment } from '../components/ImpactAssessment';
import { ActionButtons } from '../components/ActionButtons';

export function OpportunityDetailContent({
  opportunity,
  expandedSections,
  onToggleSection,
  onClose
}: {
  opportunity: Opportunity;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <PriorityBadge priority={opportunity.priority} />

      <div>
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
          {opportunity.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          📍 {opportunity.section}, Page {opportunity.page}
        </p>
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
          🎯 Opportunity:
        </h3>
        <p className="text-gray-700 dark:text-zinc-300 leading-relaxed">
          {opportunity.description}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
          ✨ Benefits:
        </h3>
        <ul className="space-y-2">
          {opportunity.benefits.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-zinc-300">
              <span className="text-green-600 dark:text-green-400 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {opportunity.naicsCode && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
            📊 Recommended NAICS Code:
          </div>
          <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
            {opportunity.naicsCode}
          </div>
        </div>
      )}

      <CollapsibleSection
        title="Suggested Language:"
        icon="✅"
        isExpanded={expandedSections.suggestedLanguage || false}
        onToggle={() => onToggleSection('suggestedLanguage')}
        titleColor="text-green-700 dark:text-green-400"
      >
        <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700 text-sm whitespace-pre-wrap text-gray-800 dark:text-zinc-200">
          {opportunity.suggestedLanguage}
        </div>
        <button className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
          📋 Copy This Text
        </button>
      </CollapsibleSection>

      <div className="border-t border-gray-200 dark:border-zinc-800" />

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

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      <ActionButtons
        actions={[
          {
            label: 'Copy Suggested Language',
            icon: '📋',
            variant: 'primary',
            onClick: () => console.log('Copy')
          },
          {
            label: 'Mark as Implemented',
            icon: '✓',
            variant: 'success',
            onClick: () => console.log('Mark implemented')
          },
          {
            label: 'Generate Alternative',
            icon: '🤖',
            variant: 'secondary',
            onClick: () => console.log('Generate')
          },
          {
            label: 'Add Note',
            icon: '📝',
            variant: 'secondary',
            onClick: () => console.log('Add note')
          },
          {
            label: 'Next Opportunity →',
            icon: '⏭️',
            variant: 'secondary',
            onClick: () => console.log('Next')
          }
        ]}
      />
    </div>
  );
}