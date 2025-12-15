'use client';

import { cn } from '@/components/ui/utils';

type ActionButton = {
  label: string;
  icon?: string;
  variant: 'primary' | 'success' | 'secondary';
  onClick: () => void;
};

type ActionButtonsProps = {
  actions: ActionButton[];
};

const buttonVariants = {
  primary: 'bg-rose-600 hover:bg-rose-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  secondary: 'border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-white'
};

export function ActionButtons({ actions }: ActionButtonsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-black dark:text-white">
        Actions:
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
              buttonVariants[action.variant]
            )}
          >
            {action.icon && <span>{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}