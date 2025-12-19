'use client';

import { useTheme } from 'next-themes';
import { ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

type AnalysisResultsLayoutProps = {
  children: ReactNode;
};

type ListProps = {
  children: ReactNode;
  isDetailOpen?: boolean;
};

type DetailProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Two-panel layout for analysis results
 *
 * Left panel: List of items (risks, questions, opportunities)
 * Right panel: Detailed view of selected item
 *
 * Responsive:
 * - Mobile: Detail panel overlays as full-screen
 * - Desktop: Side-by-side panels
 */
export function AnalysisResultsLayout({ children }: AnalysisResultsLayoutProps) {
  return (
    <div className="relative flex gap-6">
      {children}
    </div>
  );
}

/**
 * List panel - shows on left side (or full width when no detail selected)
 */
function List({ children, isDetailOpen = false }: ListProps) {
  return (
    <div className={cn(
      "w-full",
      isDetailOpen && "md:w-[40%]"
    )}>
      {children}
    </div>
  );
}

/**
 * Detail panel - shows on right side (or overlay on mobile)
 */
function Detail({ children, isOpen, onClose }: DetailProps) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile: Full screen overlay */}
      <div
        className="md:hidden fixed inset-0 z-50 overflow-y-auto"
        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
      >
        <div
          className="sticky top-0 z-10 border-b p-4"
          style={{
            backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff',
            borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7'
          }}
        >
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-pointer"
          >
            ← Back to list
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>

      {/* Desktop: Side panel */}
      <div className="hidden md:block w-[60%]">
        <div
          className="sticky top-4 border rounded-lg p-6 max-h-[calc(100vh-2rem)] overflow-y-auto"
          style={{
            backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff',
            borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7'
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xl cursor-pointer"
          >
            ✕
          </button>
          {children}
        </div>
      </div>
    </>
  );
}

AnalysisResultsLayout.List = List;
AnalysisResultsLayout.Detail = Detail;