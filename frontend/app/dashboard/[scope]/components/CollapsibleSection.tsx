'use client';

import { ReactNode } from 'react';

type CollapsibleSectionProps = {
  title: string;
  icon?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  titleColor?: string;
};

export function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  titleColor = 'text-gray-700 dark:text-gray-300'
}: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
      >
        <span className={`font-semibold ${titleColor}`}>
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </span>
        <span className="text-gray-600 dark:text-zinc-400">
          {isExpanded ? 'Hide ▲' : 'Show ▼'}
        </span>
      </button>
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-zinc-900">
          {children}
        </div>
      )}
    </div>
  );
}