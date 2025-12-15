'use client';

import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/file-upload/FileUpload';
import { ArrowIconL } from '@/components/ui/icons/ArrowIconL';

export default function UploadPage() {
  const router = useRouter();

  const handleFileChange = (files: File[]) => {
    console.log('Files uploaded:', files);
    // TODO: Handle file upload and route to next step
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950 font-sans">
      <main className="w-full max-w-3xl px-6 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-8 p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20"
          aria-label="Go back"
        >
          <ArrowIconL className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Let's import your scope document
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
          <FileUpload onChange={handleFileChange} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              // TODO: Process uploaded file and navigate to dashboard
              router.push('/dashboard');
            }}
            className="px-8 py-2.5 bg-red-800 hover:bg-red-900 dark:bg-red-900 dark:hover:bg-red-950 text-white rounded-lg font-medium transition-all"
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  );
}