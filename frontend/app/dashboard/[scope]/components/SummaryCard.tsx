'use client';

import { ReactNode } from 'react';

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
    <div className="mb-6 p-4 border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </span>
        <span className="text-sm text-gray-600 dark:text-zinc-400">
          {statusLine}
        </span>
      </div>
      <div className="text-sm text-gray-600 dark:text-zinc-400">
        {progressLine}
      </div>
      <div className="mt-2 text-sm text-gray-700 dark:text-zinc-300">
        {nextAction}
      </div>
    </div>
  );
}