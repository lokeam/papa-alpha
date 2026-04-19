import { useState } from 'react';

// Components
import { AnalysisResultsLayout } from '@/app/dashboard/[scope]/layouts/AnalysisResultLayout';
import { SummaryCard } from '@/app/dashboard/[scope]/components/SummaryCard';
import { FilterBar } from '@/app/dashboard/[scope]/components/FilterBar';
import { AccordionSection } from '@/app/dashboard/[scope]/components/AccordionSection';
import { ItemCard } from '@/app/dashboard/[scope]/components/ItemCard';
import { TipBox } from '@/app/dashboard/[scope]/components/TipBox';
import { QuestionSidePanel } from '@/app/dashboard/[scope]/side-detail-panels/QuestionSidePanel';

// Adapters
import { adaptQuestionToComponent } from '@/app/lib/adapters/analysis-adapter-scope';

// Types
import type { AnalysisResults } from '@/app/lib/types';
import type { Question as ComponentQuestion } from '@/app/dashboard/[scope]/types';

// ============================================================================
// CLARIFYING QUESTIONS CONTENT
// ============================================================================
/**
 * Displays questions to resolve before RFP release, organized by priority
 * Uses AnalysisResultsLayout for list/detail pattern
 * Data flow: Backend questions → adaptQuestionToComponent → AnalysisResultsLayout → QuestionSidePanel
 */
export function ClarifyingQuestionsContent({ analysis }: { analysis: AnalysisResults }) {
  // State management
  const [selectedQuestion, setSelectedQuestion] = useState<ComponentQuestion | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    high: true,
    medium: false,
    low: false,
  });

  // Filter state
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [sortBy, setSortBy] = useState<string>('priority');

  // Transform backend questions to component format
  const questions = analysis.questions?.questions || [];
  const transformedQuestions: ComponentQuestion[] = questions.map(adaptQuestionToComponent);

  // Extract summary data
  const totalQuestions = analysis.questions?.questions_predicted || 0;
  const urgencyBreakdown = analysis.questions?.urgency_breakdown;
  const highCount = urgencyBreakdown?.high || 0;
  const mediumCount = urgencyBreakdown?.medium || 0;
  const lowCount = urgencyBreakdown?.low || 0;

  // Apply filters
  let filteredQuestions = transformedQuestions;

  // Priority filter
  if (priorityFilter !== 'all') {
    filteredQuestions = filteredQuestions.filter(q => q.priority === priorityFilter);
  }

  // Status filter (placeholder - add status field to question type if needed)
  // if (statusFilter !== 'all') {
  //   filteredQuestions = filteredQuestions.filter(q => q.status === statusFilter);
  // }

  // Sort
  if (sortBy === 'priority') {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filteredQuestions = [...filteredQuestions].sort((a, b) =>
      priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
    );
  } else if (sortBy === 'section') {
    filteredQuestions = [...filteredQuestions].sort((a, b) => a.section.localeCompare(b.section));
  } else if (sortBy === 'page') {
    filteredQuestions = [...filteredQuestions].sort((a, b) => a.page - b.page);
  }

  // Group filtered questions by priority
  const highQuestions = filteredQuestions.filter(q => q.priority === 'high');
  const mediumQuestions = filteredQuestions.filter(q => q.priority === 'medium');
  const lowQuestions = filteredQuestions.filter(q => q.priority === 'low');

  // Toggle handlers
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAccordion = (priority: string) => {
    setExpandedAccordions(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  return (
    <AnalysisResultsLayout>
      <AnalysisResultsLayout.List isDetailOpen={!!selectedQuestion}>
        <SummaryCard
          title={`${totalQuestions} Question${totalQuestions !== 1 ? 's' : ''} Identified`}
          statusLine={
            <>
              Priority: <span className="text-rose-600 dark:text-rose-400">{highCount} High</span> • {mediumCount} Medium • {lowCount} Low
            </>
          }
          progressLine={`0 of ${totalQuestions} addressed`}
          nextAction="Next: Address HIGH priority questions before RFP release"
        />

        <FilterBar
          filters={[
            {
              label: 'Priority',
              options: [
                { label: 'Priority: All', value: 'all' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ],
              value: priorityFilter,
              onChange: setPriorityFilter,
            },
            {
              label: 'Status',
              options: [
                { label: 'Status: Open', value: 'open' },
                { label: 'All', value: 'all' },
                { label: 'Addressed', value: 'addressed' },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
            {
              label: 'Sort',
              options: [
                { label: 'Sort: Priority', value: 'priority' },
                { label: 'Section', value: 'section' },
                { label: 'Page', value: 'page' },
              ],
              value: sortBy,
              onChange: setSortBy,
            },
          ]}
        />

        <AccordionSection
          priority="high"
          title="HIGH PRIORITY"
          count={highQuestions.length}
          isExpanded={expandedAccordions.high}
          onToggle={() => toggleAccordion('high')}
        >
          <div className="space-y-2">
            {highQuestions.map(question => (
              <ItemCard
                key={question.id}
                id={question.id}
                title={question.title}
                subtitle={`${question.section}, Page ${question.page}`}
                preview={question.preview}
                isSelected={selectedQuestion?.id === question.id}
                onClick={() => setSelectedQuestion(question)}
              />
            ))}
          </div>
        </AccordionSection>

        <AccordionSection
          priority="medium"
          title="MEDIUM PRIORITY"
          count={mediumQuestions.length}
          isExpanded={expandedAccordions.medium}
          onToggle={() => toggleAccordion('medium')}
          emptyMessage="No medium priority questions found"
        >
          <div className="space-y-2">
            {mediumQuestions.map(question => (
              <ItemCard
                key={question.id}
                id={question.id}
                title={question.title}
                subtitle={`${question.section}, Page ${question.page}`}
                preview={question.preview}
                isSelected={selectedQuestion?.id === question.id}
                onClick={() => setSelectedQuestion(question)}
              />
            ))}
          </div>
        </AccordionSection>

        <AccordionSection
          priority="low"
          title="LOW PRIORITY"
          count={lowQuestions.length}
          isExpanded={expandedAccordions.low}
          onToggle={() => toggleAccordion('low')}
          emptyMessage="No low priority questions found"
        >
          <div className="space-y-2">
            {lowQuestions.map(question => (
              <ItemCard
                key={question.id}
                id={question.id}
                title={question.title}
                subtitle={`${question.section}, Page ${question.page}`}
                preview={question.preview}
                isSelected={selectedQuestion?.id === question.id}
                onClick={() => setSelectedQuestion(question)}
              />
            ))}
          </div>
        </AccordionSection>

        <TipBox message="Address HIGH priority questions before RFP release to avoid amendments and vendor confusion" />
      </AnalysisResultsLayout.List>

      <AnalysisResultsLayout.Detail
        isOpen={!!selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
      >
        {selectedQuestion && (
          <QuestionSidePanel
            question={selectedQuestion}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
          />
        )}
      </AnalysisResultsLayout.Detail>
    </AnalysisResultsLayout>
  );
}