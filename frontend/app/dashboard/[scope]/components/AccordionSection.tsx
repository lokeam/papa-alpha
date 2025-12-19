'use client';

import { ReactNode } from 'react';

// Utils
import { cn } from '@/components/ui/utils';

// Icons
import { ChevronIcon } from '@/components/ui/icons/ChevronIcon';


type Priority = 'high' | 'medium' | 'low';

type AccordionSectionProps = {
  priority: Priority;
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  emptyMessage?: string;
};

const priorityStyles = {
  high: {
    bg: 'bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    arrow: 'text-rose-600 dark:text-rose-400'
  },
  medium: {
    bg: 'hover:bg-gray-50 dark:hover:bg-zinc-800',
    text: 'text-amber-700 dark:text-amber-400',
    arrow: 'text-gray-600 dark:text-zinc-400'
  },
  low: {
    bg: 'hover:bg-gray-50 dark:hover:bg-zinc-800',
    text: 'text-green-700 dark:text-green-400',
    arrow: 'text-gray-600 dark:text-zinc-400'
  }
};

export function AccordionSection({
  priority,
  title,
  count,
  isExpanded,
  onToggle,
  children,
  emptyMessage
}: AccordionSectionProps) {
  const styles = priorityStyles[priority];

  return (
    <div className="mb-4 border rounded-lg bg-card overflow-hidden" style={{ borderColor: 'hsl(var(--card-border))' }}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between transition-colors cursor-pointer",
          styles.bg
        )}
      >
        <span className={cn("font-semibold flex items-center gap-2", styles.text)}>
          {title} ({count})
        </span>
        <ChevronIcon
          className={cn(
            "w-5 h-5 transition-transform duration-300",
            styles.arrow,
            isExpanded && "rotate-180"
          )}
        />
      </button>
      {isExpanded && (
        <div className="p-2">
          {count === 0 && emptyMessage ? (
            <div className="p-4 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}