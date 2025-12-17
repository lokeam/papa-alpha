'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/file-upload/FileUpload';

// Types
import type { ActiveJobResponse } from '@/app/api/documents/active/route';

// Icons
import { ArrowIconL } from '@/components/ui/icons/ArrowIconL';

const ACTIVE_DOCUMENTS_ENDPOINT = '/api/documents/active';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCheckingActiveJob, setIsCheckingActiveJob] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const checkForActiveJob = useCallback(async () => {
    try {
      const response = await fetch(ACTIVE_DOCUMENTS_ENDPOINT);
      const data: ActiveJobResponse = await response.json();

      if (data.documentId) {
        // Active job exists, redirect to processing page
        router.push(`/processing/${data.documentId}`);
      }
    } catch (error) {
      console.error('Failed to check for active job: ', error);
    } finally {
      setIsCheckingActiveJob(false);
    }
  }, [router]);

  useEffect(() => {
    checkForActiveJob();
  }, [checkForActiveJob]);

  const handleFileChange = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Double-check for active job before uploading
      const activeCheck = await fetch(ACTIVE_DOCUMENTS_ENDPOINT);
      const activeData: ActiveJobResponse = await activeCheck.json();

      if (activeData.documentId) {
        router.push(`/processing/${activeData.documentId}`);
        return;
      }

      // Proceed with upload
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      // Redirect to processing page
      router.push(`/processing/${result.documentId}`);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950 font-sans">
      <main className="w-full max-w-3xl px-6 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowIconL className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Let&apos;s import your scope document
          </h1>
        </div>

        {/* Instructions */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            To import your scope document, please choose a file to upload.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The file you upload needs to be a PDF that contains your project requirements and specifications.
          </p>
        </div>

        {/* Main Card with Upload Area */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 p-8 mb-8">
          {isCheckingActiveJob ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800 dark:border-red-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Checking for active jobs...</span>
            </div>
          ) : (
            <FileUpload onChange={handleFileChange} />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || isCheckingActiveJob}
            className="px-8 py-2.5 bg-red-800 hover:bg-red-900 dark:bg-red-900 dark:hover:bg-red-950 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </main>
    </div>
  );
}