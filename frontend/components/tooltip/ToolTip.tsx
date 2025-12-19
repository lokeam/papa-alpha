'use client';

import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip = ({ content, children, side = 'top', delay = 200 }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  const getPositionClass = () => {
    switch (side) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  return (
    <div
      className="relative block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-50 pointer-events-none ${getPositionClass()}`}>
          <div
            className="p-2 text-xs font-medium rounded-md shadow-lg border"
            style={{
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              borderColor: 'hsl(var(--border))',
              fontSize: '18px',
              fontWeight: 'bold',
              width: '500px',
              maxWidth: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 450ms ease-out',
            }}
          >
            {content}
          </div>
        </div>
      )}
    </div>
  );
};
