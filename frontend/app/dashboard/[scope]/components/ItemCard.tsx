'use client';

import { cn } from '@/components/ui/utils';

type ItemCardProps = {
  id: string;
  title: string;
  subtitle: string;
  preview: string;
  isSelected: boolean;
  onClick: () => void;
};

export function ItemCard({
  id,
  title,
  subtitle,
  preview,
  isSelected,
  onClick
}: ItemCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 text-left rounded-lg border transition-all duration-200",
        isSelected
          ? "border-rose-600 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/30"
          : "border-gray-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-gray-50 dark:hover:bg-zinc-800"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-gray-400 dark:text-zinc-500 mt-1">
          {isSelected ? '●' : '○'}
        </span>
        <div className="flex-1">
          <div className="font-medium text-gray-900 dark:text-white mb-1">
            {title}
          </div>
          <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">
            {subtitle}
          </div>
          <div className="text-sm text-gray-600 dark:text-zinc-400">
            {preview}
          </div>
          {!isSelected && (
            <div className="text-xs text-rose-600 dark:text-rose-400 mt-2">
              Click to review
            </div>
          )}
        </div>
      </div>
    </button>
  );
}