/**
 * SCOPE DETAIL PAGE
 *
 * Dynamic route: /dashboard/[scope]
 * Displays detailed analysis for 4 scope types:
 *   - small-business-accessibility: WCAG compliance scores & issues
 *   - identified-risks: FAR compliance risks by priority
 *   - clarifying-questions: Questions to resolve before RFP release
 *   - subcontracting-opportunities: Small business subcontracting opportunities
 *
 * ARCHITECTURE:
 * 1. Main page component (this file):
 *    - Handles routing and scope validation
 *    - Manages loading and error states
 *    - Routes to appropriate content component based on scope parameter
 *
 * 2. Content components (page-content/ folder):
 *    - SmallBusinessContent: Displays accessibility scores (custom layout)
 *    - IdentifiedRisksContent: FAR compliance risks (uses AnalysisResultsLayout)
 *    - ClarifyingQuestionsContent: RFP questions (uses AnalysisResultsLayout)
 *    - SubcontractingContent: Subcontracting opportunities (uses AnalysisResultsLayout)
 *
 * 3. Each content component:
 *    - Manages its own state (selected item, expanded sections, accordions)
 *    - Transforms backend data using adapters
 *    - Renders list/detail UI using shared components
 *
 * DATA FLOW:
 * Backend API → useDocumentAnalysis hook → Adapters → Content Components → UI
 *
 * KEY PATTERNS:
 * - Content components isolated in page-content/ for maintainability
 * - Adapters (analysis-adapter-scope.ts) transform backend data to component types
 * - AnalysisResultsLayout provides responsive two-panel layout (3 of 4 scopes)
 * - State managed locally in each content component (no render props)
 * - All inline styles preserved for theme switching
 * - Loading/Error states in shared layout components
 */

'use client';

import Link from 'next/link';
import { Suspense, use } from 'react';
import { notFound, useSearchParams } from 'next/navigation';

// Components
import { PageMain } from '@/components/layout/page-main';
import { SmallBusinessContent } from '@/app/dashboard/[scope]/page-content/SmallBusinessContent';
import { IdentifiedRisksContent } from '@/app/dashboard/[scope]/page-content/IdentifiedRisksContent';
import { ClarifyingQuestionsContent } from '@/app/dashboard/[scope]/page-content/ClarifyingQuestionsContent';
import { SubcontractingContent } from '@/app/dashboard/[scope]/page-content/SubtractingContent';

// Layout Components
import { LoadingState } from './layouts/LoadingState';
import { ErrorState } from './layouts/ErrorState';

// Hooks
import { useDocumentAnalysis } from '@/app/lib/hooks/useDocumentAnalysis';

// Types
// -- Valid scope types
const VALID_SCOPES = [
  'small-business-accessibility',
  'identified-risks',
  'clarifying-questions',
  'subcontracting-opportunities'
] as const;

type ScopeType = typeof VALID_SCOPES[number];

interface ScopePageProps {
  params: Promise<{
    scope: string;
  }>;
}

// Constants
// -- Map scope URLs to display names
const scopeDisplayNames: Record<ScopeType, string> = {
  'small-business-accessibility': 'Small Business Accessibility',
  'identified-risks': 'Identified Risks',
  'clarifying-questions': 'Clarifying Questions',
  'subcontracting-opportunities': 'Subcontracting Opportunities'
};


function ScopeDetailContent({ scope }: { scope: string }) {
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
    return <LoadingState />;
  }

  // Error state
  if (error || !analysis) {
    return <ErrorState error={error || 'No analysis data available'} />;
  }

  return (
    <PageMain>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {displayName}
          </h1>
          <p className="text-muted-foreground">
            Detailed analysis and insights
          </p>
        </div>

        {/* Content Routing - Renders appropriate component based on scope parameter */}
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

        {/* Footer Button for Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-gray-900 dark:text-white font-medium rounded-lg border border-gray-300 dark:border-zinc-700 transition-colors duration-200">
            Return to Dashboard
          </Link>
      </div>
      </div>
    </PageMain>
  );
}

export default function ScopeDetailPage({ params }: ScopePageProps) {
  const { scope } = use(params);
  // useSearchParams() must live under a Suspense boundary so that static
  // prerender can bail out cleanly (Next.js 15+ enforcement).
  return (
    <Suspense fallback={<LoadingState />}>
      <ScopeDetailContent scope={scope} />
    </Suspense>
  );
}
