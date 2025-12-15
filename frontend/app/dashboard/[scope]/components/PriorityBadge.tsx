'use client';

import { cn } from '@/components/ui/utils';

type Priority = 'high' | 'medium' | 'low';

type PriorityBadgeProps = {
  priority: Priority;
};

const priorityColors = {
  high: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950',
  medium: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950',
  low: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950'
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <div className={cn(
      "inline-block px-3 py-1 rounded-full text-sm font-semibold",
      priorityColors[priority]
    )}>
      {priority.toUpperCase()} PRIORITY
    </div>
  );
}