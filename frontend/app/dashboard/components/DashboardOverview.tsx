'use client';

import { useTheme } from 'next-themes';

// Icons
import { WarningIcon } from '@/components/ui/icons/WarningIcon';
import { BulbIcon } from '@/components/ui/icons/BulbIcon';

export function DashboardOverview({
  summary,
  actionItems
}: {
  summary: string;
  actionItems: Array<{
    icon: 'warning' | 'bulb';
    text: string;
  }>;
}) {
  const { theme } = useTheme();

  // Function to colorize specific parts of the summary
  const renderColorizedSummary = (text: string) => {
    const parts = text.split(/(\d+\s+items|\(HIGH\s+priority\)|\(MEDIUM\/LOW\s+priority\)|\d+\s+(?:risks?|questions?|opportunities))/gi);

    return parts.map((part, index) => {
      // HIGH priority
      if (/\(HIGH\s+priority\)/i.test(part)) {
        return <span key={index} className="font-bold text-red-800 dark:text-red-400">{part}</span>;
      }
      // MEDIUM/LOW priority
      else if (/\(MEDIUM\/LOW\s+priority\)/i.test(part)) {
        return <span key={index} className="font-bold text-orange-600 dark:text-orange-400">{part}</span>;
      }
      // Number + items (check context for color)
      else if (/\d+\s+items/i.test(part)) {
        // Look ahead in the original text to determine color
        const fullText = text.toLowerCase();
        const itemIndex = fullText.indexOf(part.toLowerCase());
        const contextAfter = fullText.substring(itemIndex, itemIndex + 100);

        if (contextAfter.includes('high priority')) {
          return <span key={index} className="font-bold text-red-800 dark:text-red-400">{part}</span>;
        } else if (contextAfter.includes('medium/low priority')) {
          return <span key={index} className="font-bold text-orange-600 dark:text-orange-400">{part}</span>;
        }
        return part;
      }
      // Risks
      else if (/\d+\s+risks?/i.test(part)) {
        return <span key={index} className="font-bold text-red-800 dark:text-red-400">{part}</span>;
      }
      // Questions
      else if (/\d+\s+questions?/i.test(part)) {
        return <span key={index} className="font-bold text-orange-600 dark:text-orange-400">{part}</span>;
      }
      // Opportunities
      else if (/\d+\s+opportunities/i.test(part)) {
        return <span key={index} className="font-bold text-green-600 dark:text-green-400">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div
      style={{
        borderColor: 'hsl(var(--card-border))',
        boxShadow: theme === 'dark' ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
      }}
      className="border rounded-lg p-6 bg-card mb-8"
    >
      <h2 className="text-2xl font-semibold text-foreground mb-4">
        Overview
      </h2>

      {/* Summary Text */}
      <p className="text-foreground mb-6 leading-relaxed">
        {renderColorizedSummary(summary)}
      </p>

      {/* Action Items */}
      <div className="space-y-3">
        {actionItems.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="mt-0.5">
              {item.icon === 'warning' ? (
                <WarningIcon className="w-7 h-7 text-red-800 dark:text-red-400" />
              ) : (
                <BulbIcon className="w-7 h-7 text-amber-500 dark:text-amber-400" />
              )}
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {renderColorizedSummary(item.text)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}