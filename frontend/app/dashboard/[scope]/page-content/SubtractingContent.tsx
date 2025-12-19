import { useState } from 'react';

// Components
import { AnalysisResultsLayout } from '@/app/dashboard/[scope]/layouts/AnalysisResultLayout';
import { SummaryCard } from '@/app/dashboard/[scope]/components/SummaryCard';
import { FilterBar } from '@/app/dashboard/[scope]/components/FilterBar';
import { AccordionSection } from '@/app/dashboard/[scope]/components/AccordionSection';
import { ItemCard } from '@/app/dashboard/[scope]/components/ItemCard';
import { TipBox } from '../components/TipBox';
import { OpportunitySidePanel } from '../side-detail-panels/OpportunitySidePanel';

// Adapters
import { adaptOpportunityToComponent } from '@/app/lib/adapters/analysis-adapter-scope';

// Types
import { AnalysisResults } from '@/app/lib/types';
import type { Opportunity as ComponentOpportunity } from '../types';

// ============================================================================
// SUBCONTRACTING OPPORTUNITIES CONTENT
// ============================================================================
/**
 * Displays small business subcontracting opportunities by priority
 * Uses AnalysisResultsLayout for list/detail pattern
 * Data flow: Backend opportunities → adaptOpportunityToComponent → AnalysisResultsLayout → OpportunitySidePanel
 */
export function SubcontractingContent({ analysis }: { analysis: AnalysisResults }) {
  // State management
  const [selectedOpportunity, setSelectedOpportunity] = useState<ComponentOpportunity | null>(null);
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

  // Transform backend opportunities to component format
  const opportunities = analysis.subcontracting?.opportunities || [];
  const transformedOpportunities: ComponentOpportunity[] = opportunities.map(adaptOpportunityToComponent);

  // Extract summary data
  const subAnalysis = analysis.subcontracting?.subcontracting_analysis;
  const totalOpportunities = subAnalysis?.opportunities_found || 0;

  // Apply filters
  let filteredOpportunities = transformedOpportunities;

  // Priority filter
  if (priorityFilter !== 'all') {
    filteredOpportunities = filteredOpportunities.filter(o => o.priority === priorityFilter);
  }

  // Status filter (placeholder - add status field to opportunity type if needed)
  // if (statusFilter !== 'all') {
  //   filteredOpportunities = filteredOpportunities.filter(o => o.status === statusFilter);
  // }

  // Sort
  if (sortBy === 'priority') {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filteredOpportunities = [...filteredOpportunities].sort((a, b) =>
      priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
    );
  } else if (sortBy === 'section') {
    filteredOpportunities = [...filteredOpportunities].sort((a, b) => a.section.localeCompare(b.section));
  } else if (sortBy === 'page') {
    filteredOpportunities = [...filteredOpportunities].sort((a, b) => a.page - b.page);
  }

  // Group filtered opportunities by priority
  const highOpportunities = filteredOpportunities.filter(o => o.priority === 'high');
  const mediumOpportunities = filteredOpportunities.filter(o => o.priority === 'medium');
  const lowOpportunities = filteredOpportunities.filter(o => o.priority === 'low');

  // Toggle handlers
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAccordion = (priority: string) => {
    setExpandedAccordions(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  return (
    <AnalysisResultsLayout>
      <AnalysisResultsLayout.List isDetailOpen={!!selectedOpportunity}>
        <SummaryCard
          title={`${totalOpportunities} Opportunit${totalOpportunities !== 1 ? 'ies' : 'y'} Identified`}
          statusLine={
            <>
              Priority: <span className="text-green-600 dark:text-green-400">✨ {highOpportunities.length} High</span> • {mediumOpportunities.length} Medium • {lowOpportunities.length} Low
            </>
          }
          progressLine={`0 of ${totalOpportunities} implemented`}
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
                { label: 'Implemented', value: 'implemented' },
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
                subtitle={`${opportunity.section}, Page ${opportunity.page}`}
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
          emptyMessage="No medium priority opportunities found"
        >
          <div className="space-y-2">
            {mediumOpportunities.map(opportunity => (
              <ItemCard
                key={opportunity.id}
                id={opportunity.id}
                title={opportunity.title}
                subtitle={`${opportunity.section}, Page ${opportunity.page}`}
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
                subtitle={`${opportunity.section}, Page ${opportunity.page}`}
                preview={opportunity.preview}
                isSelected={selectedOpportunity?.id === opportunity.id}
                onClick={() => setSelectedOpportunity(opportunity)}
              />
            ))}
          </div>
        </AccordionSection>

        <TipBox message="Implementing these opportunities can increase small business participation by 20-30% and reduce overall costs" />
      </AnalysisResultsLayout.List>

      <AnalysisResultsLayout.Detail
        isOpen={!!selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
      >
        {selectedOpportunity && (
          <OpportunitySidePanel
            opportunity={selectedOpportunity}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onClose={() => setSelectedOpportunity(null)}
          />
        )}
      </AnalysisResultsLayout.Detail>
    </AnalysisResultsLayout>
  );
}