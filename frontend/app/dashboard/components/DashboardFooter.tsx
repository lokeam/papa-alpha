

import { FileIcon } from '@/components/ui/icons/FileIcon';
import { FileUploadIcon } from '@/components/ui/icons/FileUploadIcon';

export function DashboardFooter() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      {/* Primary Button - Download Report */}
      <button className="w-full sm:w-auto px-6 py-3 bg-red-800 hover:bg-red-900 dark:bg-red-900 dark:hover:bg-red-950 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
        <FileIcon className="w-4 h-4" />
        Download Complete Report
      </button>

      {/* Secondary Button - Analyze Another */}
      <button className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-gray-900 dark:text-white font-medium rounded-lg border border-gray-300 dark:border-zinc-700 transition-colors duration-200 flex items-center justify-center gap-2">
        <FileUploadIcon className="w-4 h-4" />
        Analyze Another Document
      </button>

      {/* Tertiary Button - Return to Projects */}
      <button className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-gray-900 dark:text-white font-medium rounded-lg border border-gray-300 dark:border-zinc-700 transition-colors duration-200">
        Return to Projects
      </button>
    </div>
  );
}
