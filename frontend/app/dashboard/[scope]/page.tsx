'use client';
import { use, useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { useDocumentAnalysis } from '@/app/lib/hooks/useDocumentAnalysis';
import type { AnalysisResults, Risk as BackendRisk, PredictedQuestion, SubcontractingOpportunity } from '@/app/lib/types';
import type { Risk as ComponentRisk, Question as ComponentQuestion, Opportunity as ComponentOpportunity, AccessibilityScore as ComponentAccessibilityScore } from './types';
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

// Adapter functions to transform backend types to component types
function adaptRiskToComponent(risk: BackendRisk): ComponentRisk {
  return {
    id: risk.id,
    title: risk.issue_description.substring(0, 100) + '...',
    section: risk.location.section,
    page: parseInt(risk.location.page) || 0,
    preview: risk.exact_quote,
    priority: risk.severity.toLowerCase() as 'high' | 'medium' | 'low',
    problem: risk.issue_description,
    whyItMatters: [risk.reasoning, risk.impact_if_unresolved],
    suggestedFix: risk.suggested_fix,
    impact: {
      complianceRisk: risk.severity.toLowerCase() as 'high' | 'medium' | 'low',
      effortToFix: 'Medium',
      protestLikelihood: risk.severity === 'HIGH' ? 'High' : 'Low'
    }
  };
}

function adaptQuestionToComponent(q: PredictedQuestion): ComponentQuestion {
  return {
    id: q.id,
    title: q.predicted_question,
    section: q.triggered_by.location,
    page: 0,
    preview: q.triggered_by.exact_quote,
    priority: q.urgency.toLowerCase() as 'high' | 'medium' | 'low',
    question: q.predicted_question,
    context: q.triggered_by.exact_quote,
    whyAsking: q.confusion_analysis.possible_interpretations,
    suggestedApproach: q.suggested_fix || '',
    impact: {
      clarityImprovement: q.urgency.toLowerCase() as 'high' | 'medium' | 'low',
      vendorConfusion: q.confusion_analysis.why_confusing,
      responseQuality: 'Medium'
    }
  };
}

function adaptOpportunityToComponent(opp: SubcontractingOpportunity): ComponentOpportunity {
  return {
    id: opp.id,
    title: opp.area.substring(0, 100) + (opp.area.length > 100 ? '...' : ''),
    section: opp.location,
    page: 0,
    preview: opp.rfp_text,
    priority: 'medium',
    description: opp.reasoning,
    benefits: opp.suitable_business_types,
    suggestedLanguage: opp.rfp_text,
    naicsCode: opp.naics_code,
    impact: {
      smallBusinessAccess: 'high',
      competitionIncrease: 'Medium',
      costSavings: opp.estimated_value
    }
  };
}

interface ScopePageProps {
  params: Promise<{
    scope: string;
  }>;
}

export default function ScopeDetailPage({ params }: ScopePageProps) {
  const { scope } = use(params);
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  // Fetch document analysis data
  const { analysis, isLoading, error } = useDocumentAnalysis(documentId);

  // Validate scope - if invalid, show 404
  if (!VALID_SCOPES.includes(scope as ScopeType)) {
    notFound();
  }

  const displayName = scopeDisplayNames[scope as ScopeType];

  // Loading state
  if (isLoading) {
    return (
      <PageMain>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-zinc-400">Loading analysis...</p>
          </div>
        </div>
      </PageMain>
    );
  }

  // Error state
  if (error || !analysis) {
    return (
      <PageMain>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">
              {error || 'No analysis data available'}
            </p>
          </div>
        </div>
      </PageMain>
    );
  }

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
            <SmallBusinessContent analysis={analysis} />
          )}
          {scope === 'identified-risks' && (
            <IdentifiedRisksContent analysis={analysis} />
          )}
          {scope === 'clarifying-questions' && (
            <ClarifyingQuestionsContent analysis={analysis} />
          )}
          {scope === 'subcontracting-opportunities' && (
            <SubcontractingContent analysis={analysis} />
          )}
        </div>
      </div>
    </PageMain>
  );
}

// ============================================================================
// SMALL BUSINESS ACCESSIBILITY CONTENT
// ============================================================================

function SmallBusinessContent({ analysis }: { analysis: AnalysisResults }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Extract accessibility data from analysis
  const accessibilityData = analysis.accessibility?.accessibility_analysis;
  const finalScore = accessibilityData?.final_score || 0;
  const score: ComponentAccessibilityScore = {
    overallScore: finalScore,
    maxScore: 10,
    grade: finalScore >= 9 ? 'A' : finalScore >= 7 ? 'B' : finalScore >= 5 ? 'C' : finalScore >= 3 ? 'D' : 'F',
    categories: [],
    summary: accessibilityData?.rating || 'Unknown',
    criticalIssues: analysis.accessibility?.barriers?.map(b => b.exact_quote) || []
  };

  return (
    <div className="max-w-4xl mx-auto">
      <AccessibilityDetailContent
        score={score}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
      />
    </div>
  );
}

// ============================================================================
// IDENTIFIED RISKS CONTENT
// ============================================================================

function IdentifiedRisksContent({ analysis }: { analysis: AnalysisResults }) {
  // Transform backend risks to component format
  const risks = analysis.risks?.risks || [];
  const transformedRisks: ComponentRisk[] = risks.map(adaptRiskToComponent);

  const [selectedRisk, setSelectedRisk] = useState<ComponentRisk | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    high: true,
    medium: false,
    low: false
  });

  const highRisks = transformedRisks.filter(r => r.priority === 'high');
  const mediumRisks = transformedRisks.filter(r => r.priority === 'medium');
  const lowRisks = transformedRisks.filter(r => r.priority === 'low');

  const summary = analysis.risks?.analysis_summary;
  const totalRisks = summary?.total_risks_found || 0;
  const highCount = summary?.high_severity || 0;
  const mediumCount = summary?.medium_severity || 0;
  const lowCount = summary?.low_severity || 0;

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
            title={`${totalRisks} Risk${totalRisks !== 1 ? 's' : ''} Found`}
            statusLine={
              <>
                Status: <span className="text-rose-600 dark:text-rose-400">⚠️ {highCount} High</span> • {mediumCount} Medium • {lowCount} Low
              </>
            }
            progressLine={`✅ 0 of ${totalRisks} completed`}
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

function ClarifyingQuestionsContent({ analysis }: { analysis: AnalysisResults }) {
  // Transform backend questions to component format
  const questions = analysis.questions?.questions || [];
  const transformedQuestions: ComponentQuestion[] = questions.map(adaptQuestionToComponent);

  const [selectedQuestion, setSelectedQuestion] = useState<ComponentQuestion | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    high: true,
    medium: false,
    low: false
  });

  const highQuestions = transformedQuestions.filter(q => q.priority === 'high');
  const mediumQuestions = transformedQuestions.filter(q => q.priority === 'medium');
  const lowQuestions = transformedQuestions.filter(q => q.priority === 'low');

  const totalQuestions = analysis.questions?.questions_predicted || 0;
  const urgencyBreakdown = analysis.questions?.urgency_breakdown;
  const highCount = urgencyBreakdown?.high || 0;
  const mediumCount = urgencyBreakdown?.medium || 0;
  const lowCount = urgencyBreakdown?.low || 0;

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
            title={`${totalQuestions} Question${totalQuestions !== 1 ? 's' : ''} Identified`}
            statusLine={
              <>
                Priority: <span className="text-rose-600 dark:text-rose-400">⚠️ {highCount} High</span> • {mediumCount} Medium • {lowCount} Low
              </>
            }
            progressLine={`✅ 0 of ${totalQuestions} addressed`}
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

function SubcontractingContent({ analysis }: { analysis: AnalysisResults }) {
  // Transform backend opportunities to component format
  const opportunities = analysis.subcontracting?.opportunities || [];
  const transformedOpportunities: ComponentOpportunity[] = opportunities.map(adaptOpportunityToComponent);

  const [selectedOpportunity, setSelectedOpportunity] = useState<ComponentOpportunity | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    high: true,
    medium: false,
    low: false
  });

  const highOpportunities = transformedOpportunities.filter(o => o.priority === 'high');
  const mediumOpportunities = transformedOpportunities.filter(o => o.priority === 'medium');
  const lowOpportunities = transformedOpportunities.filter(o => o.priority === 'low');

  const subAnalysis = analysis.subcontracting?.subcontracting_analysis;
  const totalOpportunities = subAnalysis?.opportunities_found || 0;

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
            title={`${totalOpportunities} Opportunit${totalOpportunities !== 1 ? 'ies' : 'y'} Identified`}
            statusLine={
              <>
                Priority: <span className="text-green-600 dark:text-green-400">✨ {highOpportunities.length} High</span> • {mediumOpportunities.length} Medium • {lowOpportunities.length} Low
              </>
            }
            progressLine={`✅ 0 of ${totalOpportunities} implemented`}
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