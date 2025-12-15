'use client';

// Layout
import { PageMain } from '@/components/layout/page-main';
import { PageGrid } from '@/components/layout/page-grid';

// Components
import { DashboardTitle } from '@/app/dashboard/components/DashboardTile';
import { DashboardOverview } from '@/app/dashboard/components/DashboardOverview';
import { DashboardFooter } from '@/app/dashboard/components/DashboardFooter';
import { NextSteps } from '@/app/dashboard/components/NextSteps';
import { ScopeCard } from '@/app/dashboard/components/ScopeCard';


// Mock data
  const analysisData = {
    title: 'IT Services RFP - Analysis Complete',
    filename: 'IT_Services_Draft_RFP_v3.docx',
    pageCount: 52,
    completedAt: new Date('2025-12-14T15:47:00'),
    summary: 'Your RFP has been analyzed for compliance and quality issues. We identified 23 items that need attention across 4 categories.',
    actionItems: [
      {
        icon: 'warning' as const,
        text: '11 items require immediate action (HIGH priority)'
      },
      {
        icon: 'bulb' as const,
        text: '12 items are recommendations (MEDIUM/LOW priority)'
      }
    ],
    nextSteps: [
      'Review HIGH priority risks first (8 items need immediate fixes)',
      'Address small business accessibility score (currently 3/10)',
      'Prepare answers for clarifying questions vendors will ask',
      'Download full compliance report for stakeholder review'
    ]
  };

export default function SolicitationsDashboard() {

  return (
    <PageMain>
      <div className="max-w-6xl mx-auto">
        {/* Dashboard Title */}
        <DashboardTitle
          title={analysisData.title}
          filename={analysisData.filename}
          pageCount={analysisData.pageCount}
          completedAt={analysisData.completedAt}
        />

        {/* Overview Section */}
        <DashboardOverview
          summary={analysisData.summary}
          actionItems={analysisData.actionItems}
        />

        {/* Analysis Results Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-6">
            Analysis Results
          </h2>
          <PageGrid columns={{ sm: 1, md: 2, lg: 2 }}>
            {/* Small Business Accessibility Card */}
            <ScopeCard
              variant="score"
              title="Small Business Accessibility"
              value={3}
              maxValue={10}
              badge={{
                text: 'Needs improvement',
                variant: 'warning'
              }}
            />

            {/* Identified Risks Card */}
            <ScopeCard
              variant="risks"
              title="Identified Risks"
              value={11}
              riskBreakdown={{
                high: 8,
                medium: 3,
                low: 0
              }}
              badge={{
                text: 'Action required',
                variant: 'action'
              }}
            />

            {/* Clarifying Questions Card */}
            <ScopeCard
              variant="questions"
              title="Clarifying Questions"
              value={15}
              subtitle="questions identified"
            />

            {/* Subcontracting Opportunities Card */}
            <ScopeCard
              variant="opportunities"
              title="Subcontracting Opportunities"
              value={9}
              subtitle="opportunities identified"
            />
          </PageGrid>
        </div>

        {/* Next Steps Section */}
        <NextSteps steps={analysisData.nextSteps} />

        {/* Footer Buttons */}
        <DashboardFooter />
      </div>
    </PageMain>
  );
}
