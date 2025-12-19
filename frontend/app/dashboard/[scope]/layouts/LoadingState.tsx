'use client';

import { PageMain } from '@/components/layout/page-main';

/**
 * Loading state for scope detail pages
 * Used by: /app/dashboard/[scope]/page.tsx
 */
export function LoadingState() {
  return (
    <PageMain>
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    </PageMain>
  );
}
