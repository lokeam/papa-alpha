'use client';

import { ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

type DynamicPanelLayoutProps = {
  listContent: ReactNode;
  detailContent?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
};

export function DynamicPanelLayout({
  listContent,
  detailContent,
  isOpen,
  onClose
}: DynamicPanelLayoutProps) {
  return (
    <div className="relative flex gap-6">
      {/* List Container - Left Pane */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isOpen ? "w-full md:w-[40%] md:block hidden" : "w-full"
        )}
      >
        {listContent}
      </div>

      {/* Detail Panel - Right Pane */}
      {isOpen && detailContent && (
        <>
          {/* Mobile: Full screen overlay */}
          <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-zinc-900 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 p-4">
              <button
                onClick={onClose}
                className="text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
              >
                ← Back to list
              </button>
            </div>
            <div className="p-4">{detailContent}</div>
          </div>

          {/* Desktop: Side panel */}
          <div className="hidden md:block w-[60%]">
            <div className="sticky top-4 border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 text-xl"
              >
                ✕
              </button>
              {detailContent}
            </div>
          </div>
        </>
      )}
    </div>
  );
}