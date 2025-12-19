'use client';

import { useSearchParams, useRouter } from 'next/navigation';

// Layout
import { PageMain } from '@/components/layout/page-main';
import { PageGrid } from '@/components/layout/page-grid';

// Components
import { DashboardTitle } from '@/app/dashboard/components/DashboardTile';
import { DashboardOverview } from '@/app/dashboard/components/DashboardOverview';
import { DashboardFooter } from '@/app/dashboard/components/DashboardFooter';
import { NextSteps } from '@/app/dashboard/components/NextSteps';
import { ScopeCard } from '@/app/dashboard/components/ScopeCard';

// Hooks
import { useDocumentAnalysis } from '@/app/lib/hooks/useDocumentAnalysis';


export default function SolicitationsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  // Fetch and transform document analysis data
  const {
    document,
    summary,
    actionItems,
    nextSteps,
    summaryText,
    accessibilityBadge,
    risksBadge,
    isLoading,
    error,
  } = useDocumentAnalysis(documentId);

  // Loading state
  if (isLoading) {
    return (
      <PageMain>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading analysis...</p>
          </div>
        </div>
      </PageMain>
    );
  }

  // Error state
  if (error || !document || !summary) {
    return (
      <PageMain>
        <div className="flex min-h-screen items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <div className="bg-card rounded-lg shadow-lg border border-destructive/30 p-8">
              <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
              <p className="text-foreground mb-6">
                {error || 'Analysis results not available'}
              </p>
              <button
                onClick={() => router.push('/upload')}
                className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
              >
                Upload New Document
              </button>
            </div>
          </div>
        </div>
      </PageMain>
    );
  }

  return (
    <PageMain>
      <div className="max-w-6xl mx-auto">
        {/* Dashboard Title */}
        <DashboardTitle
          title={`${document.filename} - Analysis Complete`}
          filename={document.filename}
          pageCount={0} // TODO: Extract from metadata if available
          completedAt={new Date(document.analysis_results!.analyzed_at)}
        />

        {/* Overview Section */}
        <DashboardOverview
          summary={summaryText}
          actionItems={actionItems}
        />

        {/* Analysis Results Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Analysis Results
          </h2>
          <PageGrid columns={{ sm: 1, md: 2, lg: 2 }}>
            {/* Small Business Accessibility Card */}
            <ScopeCard
              variant="score"
              title="Small Business Accessibility"
              value={summary.accessibilityScore}
              maxValue={10}
              badge={accessibilityBadge}
              href={`/dashboard/small-business-accessibility?documentId=${documentId}`}
            />

            {/* Identified Risks Card */}
            <ScopeCard
              variant="risks"
              title="Identified Risks"
              value={summary.totalRisks}
              riskBreakdown={{
                high: summary.highRisks,
                medium: summary.mediumRisks,
                low: summary.lowRisks
              }}
              badge={risksBadge}
              href={`/dashboard/identified-risks?documentId=${documentId}`}
            />

            {/* Clarifying Questions Card */}
            <ScopeCard
              variant="questions"
              title="Clarifying Questions"
              value={summary.totalQuestions}
              subtitle="questions identified"
              href={`/dashboard/clarifying-questions?documentId=${documentId}`}
            />

            {/* Subcontracting Opportunities Card */}
            <ScopeCard
              variant="opportunities"
              title="Subcontracting Opportunities"
              value={summary.totalOpportunities}
              subtitle="opportunities identified"
              href={`/dashboard/subcontracting-opportunities?documentId=${documentId}`}
            />
          </PageGrid>
        </div>

        {/* Next Steps Section */}
        <NextSteps steps={nextSteps} />

        {/* Footer Buttons */}
        <DashboardFooter />
      </div>
    </PageMain>
  );
}
