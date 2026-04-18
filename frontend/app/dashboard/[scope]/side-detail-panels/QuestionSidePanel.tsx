'use client';

// Components
import { PriorityBadge } from '../components/PriorityBadge';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { ImpactAssessment } from '../components/ImpactAssessment';
import { ActionButtons } from '../components/ActionButtons';
import { Tooltip } from '@/components/tooltip/ToolTip';

// Types
import { Question } from "../types";

// Icon
import { AskteriskIcon } from '@/components/ui/icons/AskteriskIcon';
import { CopyIcon } from '@/components/ui/icons/CopyIcon';
import { FileIcon } from '@/components/ui/icons/FileIcon';
import { CircleQuestionMarkIcon } from '@/components/ui/icons/CircleQuestionMarkIcon';

export function QuestionSidePanel({
  question,
  expandedSections,
  onToggleSection,
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
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {question.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          <AskteriskIcon className="w-5 h-5 text-red-500" /> {question.section}, Page {question.page}
        </p>
      </div>

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          <CircleQuestionMarkIcon className="w-5 h-5 text-blue-500" /> Question:
        </h3>
        <p className="text-foreground leading-relaxed font-medium">
          {question.question}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          <FileIcon className="w-5 h-5 text-blue-500" /> Context:
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {question.context}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          <CircleQuestionMarkIcon className="w-5 h-5 text-blue-500" /> Why We&apos;re Asking:
        </h3>
        <ul className="space-y-2">
          {question.whyAsking.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
              <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <CollapsibleSection
        title="Suggested Approach:"
        isExpanded={expandedSections.suggestedApproach || false}
        onToggle={() => onToggleSection('suggestedApproach')}
        titleColor="text-green-700 dark:text-green-400"
      >
        <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700 text-sm whitespace-pre-wrap text-gray-800 dark:text-zinc-200">
          {question.suggestedApproach}
        </div>
        <button className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <CopyIcon className="w-5 h-5 text-white mr-2" /> Copy This Text
        </button>
      </CollapsibleSection>

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

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

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      <Tooltip content="Feature not yet available" side="top">
        <ActionButtons
          actions={[
            {
              label: 'Copy Suggested Approach',
              icon: 'copy',
              variant: 'primary',
            },
            {
              label: 'Mark as Addressed',
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
              label: 'Next Question →',
              icon: 'arrow',
              variant: 'secondary',
            }
          ]}
        />
      </Tooltip>
    </div>
  );
}