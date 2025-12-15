'use client';

import { Question } from "../types";
import { PriorityBadge } from '../components/PriorityBadge';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { ImpactAssessment } from '../components/ImpactAssessment';
import { ActionButtons } from '../components/ActionButtons';

export function QuestionDetailContent({
  question,
  expandedSections,
  onToggleSection,
  onClose
}: {
  question: Question;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <PriorityBadge priority={question.priority} />

      <div>
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
          {question.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          📍 {question.section}, Page {question.page}
        </p>
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
          ❓ Question:
        </h3>
        <p className="text-gray-700 dark:text-zinc-300 leading-relaxed font-medium">
          {question.question}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
          📄 Context:
        </h3>
        <p className="text-gray-700 dark:text-zinc-300 leading-relaxed">
          {question.context}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
          💡 Why We're Asking:
        </h3>
        <ul className="space-y-2">
          {question.whyAsking.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-zinc-300">
              <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <CollapsibleSection
        title="Suggested Approach:"
        icon="✅"
        isExpanded={expandedSections.suggestedApproach || false}
        onToggle={() => onToggleSection('suggestedApproach')}
        titleColor="text-green-700 dark:text-green-400"
      >
        <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700 text-sm whitespace-pre-wrap text-gray-800 dark:text-zinc-200">
          {question.suggestedApproach}
        </div>
        <button className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          📋 Copy This Text
        </button>
      </CollapsibleSection>

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      <ImpactAssessment
        metrics={[
          {
            label: 'Clarity Improvement',
            value: question.impact.clarityImprovement,
            highlight: question.impact.clarityImprovement === 'high'
          },
          {
            label: 'Vendor Confusion Risk',
            value: question.impact.vendorConfusion
          },
          {
            label: 'Response Quality Impact',
            value: question.impact.responseQuality
          }
        ]}
      />

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      <ActionButtons
        actions={[
          {
            label: 'Copy Suggested Approach',
            icon: '📋',
            variant: 'primary',
            onClick: () => console.log('Copy')
          },
          {
            label: 'Mark as Addressed',
            icon: '✓',
            variant: 'success',
            onClick: () => console.log('Mark addressed')
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
            label: 'Next Question →',
            icon: '⏭️',
            variant: 'secondary',
            onClick: () => console.log('Next')
          }
        ]}
      />
    </div>
  );
}