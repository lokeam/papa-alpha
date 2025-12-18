'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/components/ui/utils';
import { FileIcon } from '@/components/ui/icons/FileIcon';
import { WarningIcon } from '@/components/ui/icons/WarningIcon';
import { CircleQuestionMarkIcon } from '@/components/ui/icons/CircleQuestionMarkIcon';
import { HandShakeIcon } from '@/components/ui/icons/HandShakeIcon';

// Color Palette Documentation
// Light Theme:
// - Card Background: white (#ffffff)
// - Card Border: light gray (#e5e7eb / gray-200)
// - Title Text: black (#000000)
// - Value Text: black (#000000)
// - Subtitle Text: medium gray (#6b7280 / gray-500)
// - Progress Bar Background: light pink (#fecdd3 / rose-200)
// - Progress Bar Fill: dark red (#991b1b / red-800)
// - Icon Background: light pink (#ffe4e6 / rose-100)
// - Icon Color: dark red (#be123c / rose-700)
// - Risk Dot High: red (#ef4444 / red-500)
// - Risk Dot Med: orange (#f97316 / orange-500)
// - Risk Dot Low: gray (#6b7280 / gray-500)
//
// Dark Theme:
// - Card Background: dark gray (#18181b / zinc-900)
// - Card Border: darker gray (#27272a / zinc-800)
// - Title Text: white (#ffffff)
// - Value Text: white (#ffffff)
// - Subtitle Text: light gray (#a1a1aa / zinc-400)
// - Progress Bar Background: dark rose (#881337 / rose-900)
// - Progress Bar Fill: rose (#fb7185 / rose-400)
// - Icon Background: dark rose (#4c0519 / rose-950)
// - Icon Color: rose (#fb7185 / rose-400)

type ScopeCardVariant = 'score' | 'risks' | 'questions' | 'opportunities';

// Map card variants to URL slugs
const variantToUrlMap: Record<ScopeCardVariant, string> = {
  'score': 'small-business-accessibility',
  'risks': 'identified-risks',
  'questions': 'clarifying-questions',
  'opportunities': 'subcontracting-opportunities'
};

type RiskBreakdown = {
  high: number;
  medium: number;
  low: number;
};

type ScopeCardProps = {
  variant: ScopeCardVariant;
  title: string;
  value: number;
  maxValue?: number; // For score variant (e.g., 3/10)
  subtitle?: string; // For questions and opportunities variants
  riskBreakdown?: RiskBreakdown; // For risks variant
  badge?: { text: string; variant: string }; // Optional badge
  href?: string; // Optional custom URL (overrides default)
  className?: string;
};

export function ScopeCard({
  variant,
  title,
  value,
  maxValue,
  subtitle,
  riskBreakdown,
  badge,
  href,
  className
}: ScopeCardProps) {
  // Icon selection based on variant
  const getIcon = () => {
    const iconClasses = "w-5 h-5 text-rose-700 dark:text-rose-400";

    switch (variant) {
      case 'score':
        return <FileIcon className={iconClasses} />;
      case 'risks':
        return <WarningIcon className={iconClasses} />;
      case 'questions':
        return <CircleQuestionMarkIcon className={iconClasses} />;
      case 'opportunities':
        return <HandShakeIcon className={iconClasses} />;
    }
  };

  // Calculate progress percentage for score variant
  const progressPercentage = maxValue ? (value / maxValue) * 100 : 0;

  // Get the URL for this card variant (use custom href if provided)
  const detailUrl = href || `/dashboard/${variantToUrlMap[variant]}`;

  return (
    <Link href={detailUrl} className="col-span-1 h-full">
      <div
        className={cn(
          "h-full flex flex-col relative rounded-xl border bg-white dark:bg-zinc-900",
          "border-gray-200 dark:border-zinc-800",
          "p-6 transition-all duration-300 ease-in-out",
          // Hover effects:
          // - Border color changes to red (rose-600)
          // - Shadow: dark on light mode, light on dark mode
          // - Cursor becomes pointer
          "hover:border-rose-600 dark:hover:border-rose-500",
          "hover:shadow-lg hover:shadow-black/10",
          "dark:hover:shadow-xl dark:hover:shadow-white/10",
          "cursor-pointer",
          className
        )}
      >
      {/* Icon Badge - Top Right */}
      <div className="absolute top-6 right-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950">
          {getIcon()}
        </div>
      </div>

      {/* Content */}
      <div className="pr-14"> {/* Add padding to avoid icon overlap */}
        {/* Title */}
        <h3 className="text-base font-semibold text-black dark:text-white mb-3">
          {title}
        </h3>

        {/* Value Display */}
        <div className="mb-3">
          {variant === 'score' && maxValue ? (
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-black dark:text-white">
                {value}
              </span>
              <span className="text-2xl font-medium text-gray-400 dark:text-zinc-500">
                /{maxValue}
              </span>
            </div>
          ) : (
            <span className="text-4xl font-bold text-black dark:text-white">
              {value}
            </span>
          )}
        </div>

        {/* Score Progress Bar */}
        {variant === 'score' && maxValue && (
          <div className="w-full h-2 bg-rose-200 dark:bg-rose-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-800 dark:bg-rose-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        {/* Risk Breakdown */}
        {variant === 'risks' && riskBreakdown && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-700 dark:text-zinc-300">
                {riskBreakdown.high} High
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-gray-700 dark:text-zinc-300">
                {riskBreakdown.medium} Med
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-500 dark:bg-zinc-500" />
              <span className="text-gray-700 dark:text-zinc-300">
                {riskBreakdown.low} Low
              </span>
            </div>
          </div>
        )}

        {/* Subtitle (for questions and opportunities) */}
        {subtitle && (variant === 'questions' || variant === 'opportunities') && (
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    </Link>
  );
}