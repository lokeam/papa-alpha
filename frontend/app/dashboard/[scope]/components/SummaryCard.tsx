'use client';

import { ReactNode } from 'react';
import { CircleCheckIcon } from '@/components/ui/icons/CircleCheckIcon';


type SummaryCardProps = {
  title: string;
  statusLine: ReactNode;
  progressLine: string;
  nextAction: string;
};

export function SummaryCard({
  title,
  statusLine,
  progressLine,
  nextAction
}: SummaryCardProps) {
  return (
    <div className="mb-6 p-4 border rounded-lg bg-card" style={{ borderColor: 'hsl(var(--card-border))' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          {title}
        </span>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {statusLine}
        </div>
      </div>
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <CircleCheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
        {progressLine}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {nextAction}
      </div>
    </div>
  );
}