'use client';

import { useTheme } from 'next-themes';
import { cn } from '@/components/ui/utils';

// Icons
import { FileIcon } from '@/components/ui/icons/FileIcon';
import { FileDownloadIcon } from '@/components/ui/icons/FileDownloadIcon';
import { ShareIcon } from '@/components/ui/icons/ShareIcon';
import { CopyIcon } from '@/components/ui/icons/CopyIcon';
import { CircleCheckIcon } from '@/components/ui/icons/CircleCheckIcon';
import { PencilIcon } from '@/components/ui/icons/PencilIcon';
import { ArrowIconL } from '@/components/ui/icons/ArrowIconL';
import { SparklesIcon } from '@/components/ui/icons/SparklesIcon';

type ActionButton = {
  label: string;
  icon?: 'file' | 'download' | 'share' | 'copy' | 'check' | 'pencil' | 'arrow' | 'sparkles';
  variant: 'primary' | 'success' | 'secondary';
  onClick: () => void;
};

type ActionButtonsProps = {
  actions: ActionButton[];
};

export function ActionButtons({ actions }: ActionButtonsProps) {
  const { theme } = useTheme();

  const getButtonStyle = (variant: 'primary' | 'success' | 'secondary') => {
    if (variant === 'primary') {
      return {
        backgroundColor: '#881337', // primary burgundy
        color: '#ffffff'
      };
    }
    if (variant === 'success') {
      return {
        backgroundColor: '#16a34a',
        color: '#ffffff'
      };
    }
    return {
      backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
      borderColor: theme === 'dark' ? '#3f3f46' : '#d4d4d8',
      color: theme === 'dark' ? '#fafafa' : '#18181b'
    };
  };

  const getIcon = (iconType?: 'file' | 'download' | 'share' | 'copy' | 'check' | 'pencil' | 'arrow' | 'sparkles') => {
    if (!iconType) return null;

    const iconClass = "w-4 h-4";
    switch (iconType) {
      case 'file':
        return <FileIcon className={iconClass} />;
      case 'download':
        return <FileDownloadIcon className={iconClass} />;
      case 'share':
        return <ShareIcon className={iconClass} />;
      case 'copy':
        return <CopyIcon className={iconClass} />;
      case 'check':
        return <CircleCheckIcon className={iconClass} />;
      case 'pencil':
        return <PencilIcon className={iconClass} />;
      case 'arrow':
        return <ArrowIconL className={iconClass} />;
      case 'sparkles':
        return <SparklesIcon className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 w-full">
      <h3 className="text-lg font-semibold text-foreground">
        Actions:
      </h3>
      <div className="grid grid-cols-1 gap-2 w-full">
        {actions.map((action, index) => (
          <button
            disabled
            key={index}
            onClick={action.onClick}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-not-allowed",
              action.variant === 'secondary' && 'border'
            )}
            style={getButtonStyle(action.variant)}
          >
            {getIcon(action.icon)}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}