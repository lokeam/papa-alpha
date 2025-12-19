'use client';

import { useTheme } from 'next-themes';

// Components
import { Tooltip } from '@/components/tooltip/ToolTip';

// Types
import { Risk } from "../types";

// Icons
import { WarningIcon } from '@/components/ui/icons/WarningIcon';
import { XIcon } from '@/components/ui/icons/XIcon';
import { ChartBarPopularIcon } from '@/components/ui/icons/ChartBarPopularIcon';
import { ChevronIcon } from '@/components/ui/icons/ChevronIcon';
import { CircleCheckIcon } from '@/components/ui/icons/CircleCheckIcon';
import { SparklesIcon } from '@/components/ui/icons/SparklesIcon';
import { PencilIcon } from '@/components/ui/icons/PencilIcon';
import { CopyIcon } from '@/components/ui/icons/CopyIcon';

// Utils
import { cn } from '@/components/ui/utils';

export function RiskSidePanel({
  risk,
  expandedSections,
  onToggleSection,
}: {
  risk: Risk;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  console.log('RiskDetail theme:', theme);
  const priorityColors = {
    high: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950',
    medium: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950',
    low: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950'
  };

  return (
    <div className="space-y-6">
      {/* Priority Badge */}
      <div className={cn("inline-block px-3 py-1 rounded-full text-sm font-semibold", priorityColors[risk.priority])}>
        {risk.priority.toUpperCase()} PRIORITY
      </div>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {risk.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {risk.section}, Page {risk.page}
        </p>
      </div>

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      {/* Problem */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <XIcon className="w-7 h-7 text-red-500" /> Problem:
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {risk.problem}
        </p>
      </div>

      {/* Why It Matters */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <WarningIcon className="w-7 h-7 text-amber-500" /> Why This Matters:
        </h3>
        <ul className="space-y-2">
          {risk.whyItMatters.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
              <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Suggested Fix - Collapsible */}
      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'hsl(var(--card-border))' }}>
        <button
          onClick={() => onToggleSection('suggestedFix')}
          className="w-full px-4 py-3 flex items-center justify-between transition-colors cursor-pointer"
          style={{ backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5' }}
        >
          <span className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
            <CircleCheckIcon className="w-7 h-7 text-green-500" /> Suggested Fix:
          </span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{expandedSections.suggestedFix ? 'Hide' : 'Show'}</span>
            <ChevronIcon
              className={cn(
                "w-4 h-4 transition-transform duration-300",
                expandedSections.suggestedFix && "rotate-180"
              )}
            />
          </div>
        </button>
        {expandedSections.suggestedFix && (
          <div className="p-4" style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}>
            <div className="p-4 rounded border font-mono text-sm whitespace-pre-wrap text-foreground" style={{ backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5', borderColor: 'hsl(var(--card-border))' }}>
              {risk.suggestedFix}
            </div>
            <button className="mt-3 px-4 py-2 bg-primary hover:bg-primary/90 text-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <CopyIcon className="w-7 h-7 text-green-500" /> Copy This Text
            </button>
          </div>
        )}
      </div>

      {/* FAR Citation - Collapsible */}
      {risk.farCitation && (
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'hsl(var(--card-border))' }}>
          <button
            onClick={() => onToggleSection('farCitation')}
            className="w-full px-4 py-3 flex items-center justify-between transition-colors"
          style={{ backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5' }}
          >
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              FAR Citation:
            </span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{expandedSections.farCitation ? 'Hide' : 'Show'}</span>
              <ChevronIcon
                className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  expandedSections.farCitation && "rotate-180"
                )}
              />
            </div>
          </button>
          {expandedSections.farCitation && (
            <div className="p-4" style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}>
              <p className="text-sm text-muted-foreground mb-3">
                This requirement is mandated by:
              </p>
              <div className="p-4 bg-muted rounded border text-sm whitespace-pre-wrap text-foreground" style={{ borderColor: 'hsl(var(--card-border))' }}>
                {risk.farCitation}
              </div>
              <a
                href="https://acquisition.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Read full regulation at acquisition.gov
              </a>
            </div>
          )}
        </div>
      )}

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      {/* Impact Assessment */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <ChartBarPopularIcon className="w-7 h-7 text-blue-500" /> Impact Assessment:
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 rounded-lg" style={{ backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5' }}>
            <div className="text-sm text-muted-foreground">Compliance Risk:</div>
            <div className="font-semibold text-red-600 dark:text-red-400 uppercase">
              {risk.impact.complianceRisk}
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5' }}>
            <div className="text-sm text-muted-foreground">Effort to Fix:</div>
            <div className="font-semibold text-foreground">
              {risk.impact.effortToFix}
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5' }}>
            <div className="text-sm text-muted-foreground">Protest Likelihood:</div>
            <div className="font-semibold text-foreground">
              {risk.impact.protestLikelihood}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: 'hsl(var(--card-border))' }} />

      {/* Action Buttons */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-black dark:text-white">
          Actions:
        </h3>
        <Tooltip content="Buttons disabled for demo purposes" side="top">
          <div className="grid grid-cols-1 gap-2">
            <button disabled className="px-4 py-2 bg-primary text-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-not-allowed">
              <CopyIcon className="w-7 h-7 text-green-500" /> Copy Suggested Fix
            </button>
            <button disabled className="px-4 py-2 bg-green-600 text-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-not-allowed">
              <CircleCheckIcon className="w-7 h-7 text-green-500" /> Mark as Resolved
            </button>
            <button disabled className="px-4 py-2 border hover:bg-muted text-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-not-allowed">
              <SparklesIcon className="w-7 h-7 text-green-500" /> Generate Alternative
            </button>
            <button disabled className="px-4 py-2 border hover:bg-muted text-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-not-allowed">
              <PencilIcon className="w-7 h-7 text-green-500" /> Add Note
            </button>
            <button disabled className="px-4 py-2 border hover:bg-muted text-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-not-allowed">
              Next Risk →
            </button>
          </div>
        </Tooltip>

      </div>
    </div>
  );
}