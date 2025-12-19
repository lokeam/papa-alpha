
import { useState } from 'react';

// Components
import { AnalysisResultsLayout } from '@/app/dashboard/[scope]/layouts/AnalysisResultLayout';
import { SummaryCard } from '@/app/dashboard/[scope]/components/SummaryCard';
import { FilterBar } from '@/app/dashboard/[scope]/components/FilterBar';
import { AccordionSection } from '@/app/dashboard/[scope]/components/AccordionSection';
import { ItemCard } from '@/app/dashboard/[scope]/components/ItemCard';
import { TipBox } from '@/app/dashboard/[scope]/components/TipBox';
import { RiskSidePanel } from '@/app/dashboard/[scope]/side-detail-panels/RiskSidePanel';

// Adapters
import { adaptRiskToComponent } from '@/app/lib/adapters/analysis-adapter-scope';

// Types
import type { AnalysisResults } from '@/app/lib/types';
import type { Risk as ComponentRisk } from '@/app/dashboard/[scope]/types';

// ============================================================================
// IDENTIFIED RISKS CONTENT
// ============================================================================
/**
 * Displays FAR compliance risks organized by priority (High/Medium/Low)
 * Uses AnalysisResultsLayout for list/detail pattern
 * Data flow: Backend risks → adaptRiskToComponent → AnalysisResultsLayout → RiskSidePanel
 */
export function IdentifiedRisksContent({ analysis }: { analysis: AnalysisResults }) {
  // State management
  const [selectedRisk, setSelectedRisk] = useState<ComponentRisk | null>(null);
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

  // Transform backend risks to component format
  const risks = analysis.risks?.risks || [];
  const transformedRisks: ComponentRisk[] = risks.map(adaptRiskToComponent);

  // Extract summary data
  const summary = analysis.risks?.analysis_summary;
  const totalRisks = summary?.total_risks_found || 0;
  const highCount = summary?.high_severity || 0;
  const mediumCount = summary?.medium_severity || 0;
  const lowCount = summary?.low_severity || 0;

  // Apply filters
  let filteredRisks = transformedRisks;

  // Priority filter
  if (priorityFilter !== 'all') {
    filteredRisks = filteredRisks.filter(r => r.priority === priorityFilter);
  }

  // Status filter (placeholder - add status field to risk type if needed)
  // if (statusFilter !== 'all') {
  //   filteredRisks = filteredRisks.filter(r => r.status === statusFilter);
  // }

  // Sort
  if (sortBy === 'priority') {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filteredRisks = [...filteredRisks].sort((a, b) =>
      priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
    );
  } else if (sortBy === 'section') {
    filteredRisks = [...filteredRisks].sort((a, b) => a.section.localeCompare(b.section));
  } else if (sortBy === 'page') {
    filteredRisks = [...filteredRisks].sort((a, b) => a.page - b.page);
  }

  // Group filtered risks by priority
  const highRisks = filteredRisks.filter(r => r.priority === 'high');
  const mediumRisks = filteredRisks.filter(r => r.priority === 'medium');
  const lowRisks = filteredRisks.filter(r => r.priority === 'low');

  // Toggle handlers
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAccordion = (priority: string) => {
    setExpandedAccordions(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  return (
    <AnalysisResultsLayout>
      <AnalysisResultsLayout.List isDetailOpen={!!selectedRisk}>
        <SummaryCard
          title={`${totalRisks} Risk${totalRisks !== 1 ? 's' : ''} Found`}
          statusLine={
            <>
              Status: <span className="text-rose-600 dark:text-rose-400"> {highCount} High</span> • {mediumCount} Medium • {lowCount} Low
            </>
          }
          progressLine={`0 of ${totalRisks} completed`}
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
                { label: 'Resolved', value: 'resolved' },
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
                subtitle={`${risk.section}, Page ${risk.page}`}
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
          emptyMessage="No medium priority risks found"
        >
          <div className="space-y-2">
            {mediumRisks.map(risk => (
              <ItemCard
                key={risk.id}
                id={risk.id}
                title={risk.title}
                subtitle={`${risk.section}, Page ${risk.page}`}
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
                subtitle={`${risk.section}, Page ${risk.page}`}
                preview={risk.preview}
                isSelected={selectedRisk?.id === risk.id}
                onClick={() => setSelectedRisk(risk)}
              />
            ))}
          </div>
        </AccordionSection>

        <TipBox message="Address HIGH priority risks first to prevent bid protests and delays in contract award" />
      </AnalysisResultsLayout.List>

      <AnalysisResultsLayout.Detail
        isOpen={!!selectedRisk}
        onClose={() => setSelectedRisk(null)}
      >
        {selectedRisk && (
          <RiskSidePanel
            risk={selectedRisk}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onClose={() => setSelectedRisk(null)}
          />
        )}
      </AnalysisResultsLayout.Detail>
    </AnalysisResultsLayout>
  );
}
