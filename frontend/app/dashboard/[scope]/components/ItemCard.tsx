'use client';

import { useTheme } from 'next-themes';

import { AskteriskIcon } from '@/components/ui/icons/AskteriskIcon';

type ItemCardProps = {
  id: string;
  title: string;
  subtitle: string;
  preview: string;
  isSelected: boolean;
  onClick: () => void;
};

export function ItemCard({
  title,
  subtitle,
  preview,
  isSelected,
  onClick
}: ItemCardProps) {
  const { theme } = useTheme();
  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left rounded-lg border transition-all duration-200 cursor-pointer"
      style={{
        backgroundColor: isSelected
          ? (theme === 'dark' ? 'rgba(136, 19, 55, 0.3)' : '#fff1f2')
          : (theme === 'dark' ? '#09090b' : '#ffffff'),
        borderColor: isSelected
          ? (theme === 'dark' ? '#f43f5e' : '#e11d48')
          : (theme === 'dark' ? '#27272a' : '#e4e4e7')
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground mt-1">
          {isSelected ? '●' : '○'}
        </span>
        <div className="flex-1">
          <div className="font-medium text-foreground mb-1">
            {title}
          </div>
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2 mt-6">
            <AskteriskIcon className="w-8 h-8 text-red-600" />{subtitle}
          </div>
          <div className="text-sm text-muted-foreground">
            {preview}
          </div>
          {!isSelected && (
            <div className="text-sm text-red-600 dark:text-red-400 mt-6">
              Click to review
            </div>
          )}
        </div>
      </div>
    </button>
  );
}