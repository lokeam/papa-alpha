'use client';

import { PageMain } from '@/components/layout/page-main';

type ErrorStateProps = {
  error?: string;
};

/**
 * Error state for scope detail pages
 * Used by: /app/dashboard/[scope]/page.tsx
 */
export function ErrorState({ error }: ErrorStateProps) {
  return (
    <PageMain>
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">
            {error || 'No analysis data available'}
          </p>
        </div>
      </div>
    </PageMain>
  );
}
