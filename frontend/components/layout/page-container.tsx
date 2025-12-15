import { cn } from '@/components/ui/utils';
import React from 'react';

export const PageContainer = <T extends React.ElementType = "div">({
  children,
  className,
  as
}: {
  children: React.ReactNode;
  className?: string;
  as?: T;
}) => {
  const Component = as || 'div';
  return (
    <Component
      className={cn("max-w-7xl mx-auto", className)}
    >
      {children}
    </Component>
  );
};
