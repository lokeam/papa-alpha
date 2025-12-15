'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PencilIcon } from '@/components/ui/icons/PencilIcon';
import { CopyIcon } from '@/components/ui/icons/CopyIcon';
import { FileUploadIcon } from '@/components/ui/icons/FileUploadIcon';

export default function Home() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<'write' | 'copy' | 'generate'>('write');

  const handleNext = () => {
    if (selectedOption === 'generate') {
      router.push('/upload');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950 font-sans">
      <main className="w-full max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Create New Solicitation
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            Follow the steps below to create requirements for your solicitation.
            Use Hazel's AI agent to refine and enhance them, then export your
            final requirements to a professional solicitation document.
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold text-sm">
                1
              </div>
            </div>

            {/* Connector */}
            <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-700" />

            {/* Step 2 - Active */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-red-800 dark:bg-red-900 flex items-center justify-center text-white font-semibold text-sm">
                2
              </div>
            </div>

            {/* Connector */}
            <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-700" />

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold text-sm">
                3
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            How would you like to define your requirements?
          </h2>

          <div className="space-y-4 mb-8">
            {/* Option 1: Write new requirements - DISABLED */}
            <button
              disabled
              className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 opacity-50 cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <PencilIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <h3 className="font-semibold text-gray-500 dark:text-gray-500">
                      Write new requirements
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-600">
                    Describe your procurement objective
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: Copy from existing solicitation - DISABLED */}
            <button
              disabled
              className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 opacity-50 cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CopyIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <h3 className="font-semibold text-gray-500 dark:text-gray-500">
                      Copy from existing solicitation
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-600">
                    Start with requirements from a past project
                  </p>
                </div>
              </div>
            </button>

            {/* Option 3: Generate from scope document - ACTIVE */}
            <button
              onClick={() => setSelectedOption('generate')}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedOption === 'generate'
                  ? 'border-red-800 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
                  : 'border-gray-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-900/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedOption === 'generate'
                        ? 'border-red-800 dark:border-red-900 bg-red-800 dark:bg-red-900'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {selectedOption === 'generate' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileUploadIcon className="w-5 h-5 text-red-800 dark:text-red-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Generate from scope document
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload a PDF to extract requirements
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors flex items-center gap-2"
            >
              <span>←</span>
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              disabled={selectedOption !== 'generate'}
              className={`px-8 py-2.5 rounded-lg font-medium transition-all ${
                selectedOption === 'generate'
                  ? 'bg-red-800 hover:bg-red-900 dark:bg-red-900 dark:hover:bg-red-950 text-white cursor-pointer'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
