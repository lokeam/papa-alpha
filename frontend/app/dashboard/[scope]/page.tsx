'use client';
import { use, useState } from 'react';
import { notFound } from 'next/navigation';
import { PageMain } from '@/components/layout/page-main';

// Components
import { RiskDetailContent } from './variants/RiskDetail';
import { QuestionDetailContent } from './variants/QuestionDetail';
import { OpportunityDetailContent } from './variants/OpportunityDetail';
import { AccessibilityDetailContent } from './variants/AccessibilityDetail';
import { DynamicPanelLayout } from './components/DynamicPanelLayout';
import { SummaryCard } from './components/SummaryCard';
import { FilterBar } from './components/FilterBar';
import { AccordionSection } from './components/AccordionSection';
import { ItemCard } from './components/ItemCard';
import { TipBox } from './components/TipBox';

// Mock Data
import { mockRisks, mockQuestions, mockOpportunities, mockAccessibilityScore } from './mockData';

// Valid scope types
const VALID_SCOPES = [
  'small-business-accessibility',
  'identified-risks',
  'clarifying-questions',
  'subcontracting-opportunities'
] as const;

type ScopeType = typeof VALID_SCOPES[number];

// Map scope URLs to display names
const scopeDisplayNames: Record<ScopeType, string> = {
  'small-business-accessibility': 'Small Business Accessibility',
  'identified-risks': 'Identified Risks',
  'clarifying-questions': 'Clarifying Questions',
  'subcontracting-opportunities': 'Subcontracting Opportunities'
};

interface ScopePageProps {
  params: Promise<{
    scope: string;
  }>;
}

export default function ScopeDetailPage({ params }: ScopePageProps) {
  const { scope } = use(params);

  // Validate scope - if invalid, show 404
  if (!VALID_SCOPES.includes(scope as ScopeType)) {
    notFound();
  }

  const displayName = scopeDisplayNames[scope as ScopeType];

  return (
    <PageMain>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            {displayName}
          </h1>
          <p className="text-gray-600 dark:text-zinc-400">
            Detailed analysis and insights
          </p>
        </div>

        {/* Content based on scope type */}
        <div className="space-y-6">
          {scope === 'small-business-accessibility' && (
            <SmallBusinessContent />
          )}
          {scope === 'identified-risks' && (
            <IdentifiedRisksContent />
          )}
          {scope === 'clarifying-questions' && (
            <ClarifyingQuestionsContent />
          )}
          {scope === 'subcontracting-opportunities' && (
            <SubcontractingContent />
          )}
        </div>
      </div>
    </PageMain>
  );
}

// ============================================================================
// SMALL BUSINESS ACCESSIBILITY CONTENT
// ============================================================================

function SmallBusinessContent() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <AccessibilityDetailContent
        score={mockAccessibilityScore}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
      />
    </div>
  );
}

// ============================================================================
// IDENTIFIED RISKS CONTENT
// ============================================================================

function IdentifiedRisksContent() {
  const [selectedRisk, setSelectedRisk] = useState<typeof mockRisks[0] | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    high: true,
    medium: false,
    low: false
  });

  const highRisks = mockRisks.filter(r => r.priority === 'high');
  const mediumRisks = mockRisks.filter(r => r.priority === 'medium');
  const lowRisks = mockRisks.filter(r => r.priority === 'low');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAccordion = (priority: string) => {
    setExpandedAccordions(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  return (
    <DynamicPanelLayout
      isOpen={!!selectedRisk}
      onClose={() => setSelectedRisk(null)}
      listContent={
        <>
          <SummaryCard
            title="11 Risks Found"
            statusLine={
              <>
                Status: <span className="text-rose-600 dark:text-rose-400">⚠️ 8 High</span> • 3 Medium • 0 Low
              </>
            }
            progressLine="✅ 0 of 11 completed"
            nextAction="Next: Review HIGH priority items to prevent bid protests"
          />

          <FilterBar
            filters={[
              {
                label: 'Priority',
                options: [
                  { label: 'Priority: All', value: 'all' },
                  { label: 'High', value: 'high' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Low', value: 'low' }
                ]
              },
              {
                label: 'Status',
                options: [
                  { label: 'Status: Open', value: 'open' },
                  { label: 'All', value: 'all' },
                  { label: 'Resolved', value: 'resolved' }
                ]
              },
              {
                label: 'Sort',
                options: [
                  { label: 'Sort: Priority', value: 'priority' },
                  { label: 'Section', value: 'section' },
                  { label: 'Page', value: 'page' }
                ]
              }
            ]}
          />

          <AccordionSection
            priority="high"
            title="HIGH PRIORITY"
            count={highRisks.length}
            isExpanded={expandedAccordions.high}
            onToggle={() => toggleAccordion('high')}
          >
            <div className="space-y-2">
              {highRisks.map(risk => (
                <ItemCard
                  key={risk.id}
                  id={risk.id}
                  title={risk.title}
                  subtitle={`📍 ${risk.section}, Page ${risk.page}`}
                  preview={risk.preview}
                  isSelected={selectedRisk?.id === risk.id}
                  onClick={() => setSelectedRisk(risk)}
                />
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            priority="medium"
            title="MEDIUM PRIORITY"
            count={mediumRisks.length}
            isExpanded={expandedAccordions.medium}
            onToggle={() => toggleAccordion('medium')}
            emptyMessage="No medium priority risks in mock data"
          >
            <div className="space-y-2">
              {mediumRisks.map(risk => (
                <ItemCard
                  key={risk.id}
                  id={risk.id}
                  title={risk.title}
                  subtitle={`📍 ${risk.section}, Page ${risk.page}`}
                  preview={risk.preview}
                  isSelected={selectedRisk?.id === risk.id}
                  onClick={() => setSelectedRisk(risk)}
                />
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            priority="low"
            title="LOW PRIORITY"
            count={lowRisks.length}
            isExpanded={expandedAccordions.low}
            onToggle={() => toggleAccordion('low')}
            emptyMessage="No low priority risks found"
          >
            <div className="space-y-2">
              {lowRisks.map(risk => (
                <ItemCard
                  key={risk.id}
                  id={risk.id}
                  title={risk.title}
                  subtitle={`📍 ${risk.section}, Page ${risk.page}`}
                  preview={risk.preview}
                  isSelected={selectedRisk?.id === risk.id}
                  onClick={() => setSelectedRisk(risk)}
                />
              ))}
            </div>
          </AccordionSection>

          <TipBox message="Address HIGH priority risks first to prevent bid protests and delays in contract award" />
        </>
      }
      detailContent={
        selectedRisk && (
          <RiskDetailContent
            risk={selectedRisk}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onClose={() => setSelectedRisk(null)}
          />
        )
      }
    />
  );
}

// ============================================================================
// CLARIFYING QUESTIONS CONTENT
// ============================================================================

function ClarifyingQuestionsContent() {
  const [selectedQuestion, setSelectedQuestion] = useState<typeof mockQuestions[0] | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    high: true,
    medium: false,
    low: false
  });

  const highQuestions = mockQuestions.filter(q => q.priority === 'high');
  const mediumQuestions = mockQuestions.filter(q => q.priority === 'medium');
  const lowQuestions = mockQuestions.filter(q => q.priority === 'low');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAccordion = (priority: string) => {
    setExpandedAccordions(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  return (
    <DynamicPanelLayout
      isOpen={!!selectedQuestion}
      onClose={() => setSelectedQuestion(null)}
      listContent={
        <>
          <SummaryCard
            title="15 Questions Identified"
            statusLine={
              <>
                Priority: <span className="text-rose-600 dark:text-rose-400">⚠️ 2 High</span> • 8 Medium • 5 Low
              </>
            }
            progressLine="✅ 0 of 15 addressed"
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
                  { label: 'Low', value: 'low' }
                ]
              },
              {
                label: 'Status',
                options: [
                  { label: 'Status: Open', value: 'open' },
                  { label: 'All', value: 'all' },
                  { label: 'Addressed', value: 'addressed' }
                ]
              },
              {
                label: 'Sort',
                options: [
                  { label: 'Sort: Priority', value: 'priority' },
                  { label: 'Section', value: 'section' },
                  { label: 'Page', value: 'page' }
                ]
              }
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
                  subtitle={`📍 ${question.section}, Page ${question.page}`}
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
            emptyMessage="No medium priority questions in mock data"
          >
            <div className="space-y-2">
              {mediumQuestions.map(question => (
                <ItemCard
                  key={question.id}
                  id={question.id}
                  title={question.title}
                  subtitle={`📍 ${question.section}, Page ${question.page}`}
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
                  subtitle={`📍 ${question.section}, Page ${question.page}`}
                  preview={question.preview}
                  isSelected={selectedQuestion?.id === question.id}
                  onClick={() => setSelectedQuestion(question)}
                />
              ))}
            </div>
          </AccordionSection>

          <TipBox message="Address HIGH priority questions before RFP release to avoid amendments and vendor confusion" />
        </>
      }
      detailContent={
        selectedQuestion && (
          <QuestionDetailContent
            question={selectedQuestion}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onClose={() => setSelectedQuestion(null)}
          />
        )
      }
    />
  );
}

// ============================================================================
// SUBCONTRACTING OPPORTUNITIES CONTENT
// ============================================================================

function SubcontractingContent() {
  const [selectedOpportunity, setSelectedOpportunity] = useState<typeof mockOpportunities[0] | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    high: true,
    medium: false,
    low: false
  });

  const highOpportunities = mockOpportunities.filter(o => o.priority === 'high');
  const mediumOpportunities = mockOpportunities.filter(o => o.priority === 'medium');
  const lowOpportunities = mockOpportunities.filter(o => o.priority === 'low');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAccordion = (priority: string) => {
    setExpandedAccordions(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  return (
    <DynamicPanelLayout
      isOpen={!!selectedOpportunity}
      onClose={() => setSelectedOpportunity(null)}
      listContent={
        <>
          <SummaryCard
            title="9 Opportunities Identified"
            statusLine={
              <>
                Priority: <span className="text-green-600 dark:text-green-400">✨ 2 High</span> • 5 Medium • 2 Low
              </>
            }
            progressLine="✅ 0 of 9 implemented"
            nextAction="Next: Add HIGH priority opportunities to maximize small business participation"
          />

          <FilterBar
            filters={[
              {
                label: 'Priority',
                options: [
                  { label: 'Priority: All', value: 'all' },
                  { label: 'High', value: 'high' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Low', value: 'low' }
                ]
              },
              {
                label: 'Status',
                options: [
                  { label: 'Status: Open', value: 'open' },
                  { label: 'All', value: 'all' },
                  { label: 'Implemented', value: 'implemented' }
                ]
              },
              {
                label: 'Sort',
                options: [
                  { label: 'Sort: Priority', value: 'priority' },
                  { label: 'Section', value: 'section' },
                  { label: 'Impact', value: 'impact' }
                ]
              }
            ]}
          />

          <AccordionSection
            priority="high"
            title="HIGH PRIORITY"
            count={highOpportunities.length}
            isExpanded={expandedAccordions.high}
            onToggle={() => toggleAccordion('high')}
          >
            <div className="space-y-2">
              {highOpportunities.map(opportunity => (
                <ItemCard
                  key={opportunity.id}
                  id={opportunity.id}
                  title={opportunity.title}
                  subtitle={`📍 ${opportunity.section}, Page ${opportunity.page}`}
                  preview={opportunity.preview}
                  isSelected={selectedOpportunity?.id === opportunity.id}
                  onClick={() => setSelectedOpportunity(opportunity)}
                />
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            priority="medium"
            title="MEDIUM PRIORITY"
            count={mediumOpportunities.length}
            isExpanded={expandedAccordions.medium}
            onToggle={() => toggleAccordion('medium')}
            emptyMessage="No medium priority opportunities in mock data"
          >
            <div className="space-y-2">
              {mediumOpportunities.map(opportunity => (
                <ItemCard
                  key={opportunity.id}
                  id={opportunity.id}
                  title={opportunity.title}
                  subtitle={`📍 ${opportunity.section}, Page ${opportunity.page}`}
                  preview={opportunity.preview}
                  isSelected={selectedOpportunity?.id === opportunity.id}
                  onClick={() => setSelectedOpportunity(opportunity)}
                />
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            priority="low"
            title="LOW PRIORITY"
            count={lowOpportunities.length}
            isExpanded={expandedAccordions.low}
            onToggle={() => toggleAccordion('low')}
            emptyMessage="No low priority opportunities found"
          >
            <div className="space-y-2">
              {lowOpportunities.map(opportunity => (
                <ItemCard
                  key={opportunity.id}
                  id={opportunity.id}
                  title={opportunity.title}
                  subtitle={`📍 ${opportunity.section}, Page ${opportunity.page}`}
                  preview={opportunity.preview}
                  isSelected={selectedOpportunity?.id === opportunity.id}
                  onClick={() => setSelectedOpportunity(opportunity)}
                />
              ))}
            </div>
          </AccordionSection>

          <TipBox message="Implementing these opportunities can increase small business participation by 20-30% and reduce overall costs" />
        </>
      }
      detailContent={
        selectedOpportunity && (
          <OpportunityDetailContent
            opportunity={selectedOpportunity}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onClose={() => setSelectedOpportunity(null)}
          />
        )
      }
    />
  );
}