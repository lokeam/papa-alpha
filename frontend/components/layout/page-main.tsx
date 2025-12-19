import React from 'react';
import { cn } from '@/components/ui/utils';

interface PageMainProps extends React.HTMLAttributes<HTMLDivElement> {
  fixed?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

export function PageMain({
  fixed,
  ...props
}: PageMainProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-[#B8D9FF]/3 border border-border shadow-page dark:shadow-none',
        'rounded-3xl',
        'peer-[.header-fixed]/header:mt-16',
        'w-full max-w-7xl mx-auto',
        'px-16 pt-12 pb-24',
        fixed && 'fixed-main flex flex-col grow overflow-hidden'
      )}
      {...props}
    />
  );
}
