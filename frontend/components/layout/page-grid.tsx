import React from 'react';
import { cn } from '@/components/ui/utils';

interface PageGridProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  children?: React.ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
};

export function PageGrid({
  className,
  children,
  columns = { sm: 2, lg: 4 },
  ...props
}: PageGridProps) {
  const gridColumns = cn(
    'grid gap-4',
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
  );

  return (
    <div className={cn(gridColumns, className)} {...props}>
      {children}
    </div>
  );
}
