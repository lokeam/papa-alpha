'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { PencilIcon } from '@/components/ui/icons/PencilIcon';
import { CopyIcon } from '@/components/ui/icons/CopyIcon';
import { FileUploadIcon } from '@/components/ui/icons/FileUploadIcon';

export default function Home() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [selectedOption, setSelectedOption] = useState<'write' | 'copy' | 'generate'>('write');
  const [isHovered, setIsHovered] = useState(false);

  // resolvedTheme is undefined until next-themes hydrates; treat that as light
  // so SSR and first client render produce identical markup.
  const isDark = resolvedTheme === 'dark';

  const handleNext = () => {
    if (selectedOption === 'generate') {
      router.push('/upload');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="w-full max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Create New Solicitation
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Follow the steps below to create requirements for your solicitation.
            Use Hazel&apos;s AI agent to refine and enhance them, then export your
            final requirements to a professional solicitation document.
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                style={{
                  backgroundColor: isDark ? 'hsl(0, 0%, 40%)' : 'hsl(0, 99%, 90%)',
                  color: isDark ? 'hsl(0, 0%, 80%)' : 'hsl(0, 78%, 40%)'
                }}
              >
                1
              </div>
            </div>

            {/* Connector */}
            <div className="w-16 h-0.5" style={{ backgroundColor: isDark ? 'hsl(0, 78%, 30%)' : 'hsl(0, 0%, 85%)' }} />

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
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm" style={{ backgroundColor: isDark ? 'hsl(0, 0%, 25%)' : 'hsl(0, 0%, 85%)', color: isDark ? 'hsl(0, 0%, 60%)' : 'hsl(0, 0%, 45%)' }}>
                3
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-card rounded-lg shadow-lg border p-8" style={{ borderColor: 'hsl(var(--card-border))' }}>
          <h2 className="text-lg font-semibold text-foreground mb-6">
            How would you like to define your requirements?
          </h2>

          <div className="space-y-4 mb-8">
            {/* Option 1: Write new requirements - DISABLED */}
            <button
              disabled
              className="w-full text-left p-4 rounded-lg border-2 shadow-sm cursor-not-allowed"
              style={{ backgroundColor: 'hsl(var(--disabled))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--disabled-foreground))' }}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'hsl(var(--border))' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <PencilIcon className="w-5 h-5" style={{ color: 'hsl(var(--disabled-foreground))' }} />
                    <h3 className="font-semibold" style={{ color: 'hsl(var(--disabled-foreground))' }}>
                      Write new requirements
                    </h3>
                  </div>
                  <p className="text-sm" style={{ color: 'hsl(var(--disabled-foreground))' }}>
                    Describe your procurement objective
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: Copy from existing solicitation - DISABLED */}
            <button
              disabled
              className="w-full text-left p-4 rounded-lg border-2 shadow-sm cursor-not-allowed"
              style={{ backgroundColor: 'hsl(var(--disabled))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--disabled-foreground))' }}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'hsl(var(--border))' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CopyIcon className="w-5 h-5" style={{ color: 'hsl(var(--disabled-foreground))' }} />
                    <h3 className="font-semibold" style={{ color: 'hsl(var(--disabled-foreground))' }}>
                      Copy from existing solicitation
                    </h3>
                  </div>
                  <p className="text-sm" style={{ color: 'hsl(var(--disabled-foreground))' }}>
                    Start with requirements from a past project
                  </p>
                </div>
              </div>
            </button>

            {/* Option 3: Generate from scope document - ACTIVE */}
            <button
              onClick={() => setSelectedOption('generate')}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="w-full text-left p-4 rounded-lg border-2 cursor-pointer"
              style={{
                borderColor: selectedOption === 'generate'
                  ? 'hsl(1, 78%, 29%)'
                  : (isDark ? 'hsl(0, 0%, 25%)' : 'hsl(0, 0%, 85%)'),
                backgroundColor: selectedOption === 'generate'
                  ? (isDark ? 'hsl(1, 78%, 10%)' : 'hsl(0, 0%, 100%)')
                  : (isDark ? 'hsl(0, 0%, 10%)' : 'hsl(0, 0%, 100%)'),
                boxShadow: isHovered
                  ? (isDark ? '0 20px 25px -5px rgba(185, 28, 28, 0.4), 0 8px 10px -6px rgba(185, 28, 28, 0.3)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)')
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
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
                    <h3 className="font-semibold text-foreground">
                      Generate from scope document
                    </h3>
                  </div>
                  <p className="text-sm text-foreground">
                    Upload a PDF to extract requirements
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 text-gray-600 hover:text-foreground font-medium transition-colors flex items-center gap-2 cursor-not-allowed"
            >
              <span>←</span>
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              disabled={selectedOption !== 'generate'}
              className={`px-8 py-2.5 rounded-lg font-medium transition-all ${
                selectedOption === 'generate'
                  ? 'bg-red-800 hover:bg-red-900 dark:bg-red-900 dark:hover:bg-red-950 border-2 hover:border-red-800 text-white cursor-pointer'
                  : 'bg-muted text-muted-foreground cursor-pointer'
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
