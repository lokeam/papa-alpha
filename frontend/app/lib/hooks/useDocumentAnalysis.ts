/**
 * Custom hook for fetching and transforming document analysis data
 * Centralizes data fetching, transformation, and state management
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DocumentWithAnalysis, AnalysisResults } from '@/app/lib/types';
import {
  extractDashboardSummary,
  generateNextSteps,
  generateActionItems,
  generateSummaryText,
  getAccessibilityBadge,
  getRisksBadge,
  type ActionItem,
  type Badge,
} from '@/app/lib/adapters/analysis-adapter';

export interface UseDocumentAnalysisReturn {
  // Raw data
  document: DocumentWithAnalysis | null;
  analysis: AnalysisResults | null;

  // Transformed data
  summary: ReturnType<typeof extractDashboardSummary> | null;
  actionItems: ActionItem[];
  nextSteps: string[];
  summaryText: string;
  accessibilityBadge: Badge | undefined;
  risksBadge: Badge | undefined;

  // State
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetch and transform document analysis data
 * @param documentId - Document ID from URL params
 * @param redirectOnMissing - Whether to redirect to /upload if no documentId (default: true)
 */
export function useDocumentAnalysis(
  documentId: string | null,
  redirectOnMissing: boolean = true
): UseDocumentAnalysisReturn {
  const router = useRouter();
  const [document, setDocument] = useState<DocumentWithAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        let url: string;

        if (documentId) {
          // Fetch specific document by ID
          url = `/api/documents/${documentId}`;
        } else {
          // Fetch latest completed document
          url = '/api/documents/latest';
        }

        const response = await fetch(url);

        if (!response.ok) {
          // If no latest document found and redirect is enabled, go to upload
          if (!documentId && response.status === 404 && redirectOnMissing) {
            router.push('/upload');
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          console.error('[useDocumentAnalysis] Fetch failed:', response.status, errorData);
          throw new Error(errorData.error || 'Document not found');
        }

        const data: DocumentWithAnalysis = await response.json();

        // Surface failed status with the actual error message
        if (data.status === 'failed') {
          throw new Error(data.error_message || 'Analysis failed');
        }

        // Ensure document has analysis results
        if (!data.analysis_results) {
          throw new Error('Analysis results not available');
        }

        setDocument(data);

        // If we loaded latest document, update URL to include its ID
        if (!documentId && data.id) {
          router.replace(`/dashboard?documentId=${data.id}`, { scroll: false });
        }
      } catch (err) {
        console.error('Failed to fetch document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, redirectOnMissing, router]);

  // Transform data using adapters (only if document exists)
  const analysis = document?.analysis_results ?? null;
  const summary = analysis ? extractDashboardSummary(analysis) : null;
  const actionItems = analysis ? generateActionItems(analysis) : [];
  const nextSteps = analysis ? generateNextSteps(analysis) : [];
  const summaryText = analysis ? generateSummaryText(analysis) : '';
  const accessibilityBadge = summary
    ? getAccessibilityBadge(summary.accessibilityScore)
    : undefined;
  const risksBadge = summary ? getRisksBadge(summary.highRisks) : undefined;

  return {
    // Raw data
    document,
    analysis,

    // Transformed data
    summary,
    actionItems,
    nextSteps,
    summaryText,
    accessibilityBadge,
    risksBadge,

    // State
    isLoading,
    error,
  };
}
