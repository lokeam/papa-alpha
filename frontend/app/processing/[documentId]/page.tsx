'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Document } from '@/app/lib/repositories/document-repository';
import { useUpdateProgress } from '@/app/lib/hooks/useUpdateProgress';

interface ProcessingPageProps {
  params: Promise<{ documentId: string }>;
}

const DASHBOARD_PATH = '/dashboard';

export default function ProcessingPage({ params }: ProcessingPageProps) {
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time progress tracking
  const { progress, currentStep, isComplete, error: progressError } = useUpdateProgress(documentId);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setDocumentId(p.documentId));
  }, [params]);

  // Fetch document when documentId is available
  useEffect(() => {
    if (!documentId) return;

    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`);

        if (!response.ok) {
          throw new Error('Document not found');
        }

        const data: Document = await response.json();
        setDocument(data);

        // Check if already completed
        if (data.status === 'completed') {
          router.push(`${DASHBOARD_PATH}?documentId=${documentId}`);
          return;
        }

        // Check if failed
        if (data.status === 'failed') {
          setError(data.error_message || 'Analysis failed');
        }
      } catch (err) {
        console.error('Failed to fetch document:', err);
        setError('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, router]);

  // Handle completion
  useEffect(() => {
    if (isComplete && documentId) {
      setTimeout(() => {
        router.push(`${DASHBOARD_PATH}?documentId=${documentId}`);
      }, 1000);
    }
  }, [isComplete, documentId, router]);

  // Handle progress errors
  useEffect(() => {
    if (progressError) {
      setError(progressError);
    }
  }, [progressError]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 dark:border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-red-200 dark:border-red-800 p-8">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => router.push('/upload')}
              className="w-full px-6 py-3 bg-red-800 hover:bg-red-900 dark:bg-red-900 dark:hover:bg-red-950 text-white rounded-lg font-medium transition-colors"
            >
              Upload New Document
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950 font-sans">
      <main className="w-full max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Analyzing Your Document
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we process your RFP
          </p>
        </div>

        {/* Processing Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 p-8">
          {/* Document Info */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Document
            </h2>
            <p className="text-gray-700 dark:text-gray-300">{document.filename}</p>
          </div>

          {/* Progress Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Progress
            </h2>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-800 dark:from-red-700 dark:to-red-900 transition-all duration-500 ease-in-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Status Message */}
            <div className="flex items-center gap-3">
              {isComplete ? (
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-800 dark:border-red-600"></div>
              )}
              <p className={isComplete ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}>
                {isComplete ? 'Analysis complete! Redirecting...' : currentStep}
              </p>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              This process typically takes 1-2 minutes. Please don&apos;t close this page.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
