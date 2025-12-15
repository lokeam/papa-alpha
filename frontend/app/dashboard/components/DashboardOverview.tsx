

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
  return (
    <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-900 mb-8">
      <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
        Overview
      </h2>

      {/* Summary Text */}
      <p className="text-gray-700 dark:text-zinc-300 mb-6 leading-relaxed">
        {summary}
      </p>

      {/* Action Items */}
      <div className="space-y-3">
        {actionItems.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="mt-0.5">
              {item.icon === 'warning' ? (
                <WarningIcon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              ) : (
                <BulbIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}