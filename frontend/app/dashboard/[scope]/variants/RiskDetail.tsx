'use client';

import { Risk } from "../types";
import { cn } from '@/components/ui/utils';
import { PriorityBadge } from '../components/PriorityBadge';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { ImpactAssessment } from '../components/ImpactAssessment';
import { ActionButtons } from '../components/ActionButtons';

export function RiskDetailContent({
  risk,
  expandedSections,
  onToggleSection,
  onClose
}: {
  risk: Risk;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onClose: () => void;
}) {
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
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
          {risk.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          📍 {risk.section}, Page {risk.page}
        </p>
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      {/* Problem */}
      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
          ❌ Problem:
        </h3>
        <p className="text-gray-700 dark:text-zinc-300 leading-relaxed">
          {risk.problem}
        </p>
      </div>

      {/* Why It Matters */}
      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
          ⚠️ Why This Matters:
        </h3>
        <ul className="space-y-2">
          {risk.whyItMatters.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-zinc-300">
              <span className="text-rose-600 dark:text-rose-400 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Suggested Fix - Collapsible */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <button
          onClick={() => onToggleSection('suggestedFix')}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
        >
          <span className="font-semibold text-green-700 dark:text-green-400">
            ✅ Suggested Fix:
          </span>
          <span className="text-gray-600 dark:text-zinc-400">
            {expandedSections.suggestedFix ? 'Hide ▲' : 'Show ▼'}
          </span>
        </button>
        {expandedSections.suggestedFix && (
          <div className="p-4 bg-white dark:bg-zinc-900">
            <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700 font-mono text-sm whitespace-pre-wrap text-gray-800 dark:text-zinc-200">
              {risk.suggestedFix}
            </div>
            <button className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors">
              📋 Copy This Text
            </button>
          </div>
        )}
      </div>

      {/* FAR Citation - Collapsible */}
      {risk.farCitation && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <button
            onClick={() => onToggleSection('farCitation')}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              📖 FAR Citation:
            </span>
            <span className="text-gray-600 dark:text-zinc-400">
              {expandedSections.farCitation ? 'Hide ▲' : 'Show ▼'}
            </span>
          </button>
          {expandedSections.farCitation && (
            <div className="p-4 bg-white dark:bg-zinc-900">
              <p className="text-sm text-gray-700 dark:text-zinc-300 mb-3">
                This requirement is mandated by:
              </p>
              <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700 text-sm whitespace-pre-wrap text-gray-800 dark:text-zinc-200">
                {risk.farCitation}
              </div>
              <a
                href="https://acquisition.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                📚 Read full regulation at acquisition.gov →
              </a>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      {/* Impact Assessment */}
      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
          📊 Impact Assessment:
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-zinc-400">Compliance Risk:</div>
            <div className="font-semibold text-rose-600 dark:text-rose-400 uppercase">
              {risk.impact.complianceRisk}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-zinc-400">Effort to Fix:</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {risk.impact.effortToFix}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-zinc-400">Protest Likelihood:</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {risk.impact.protestLikelihood}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-800" />

      {/* Action Buttons */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-black dark:text-white">
          Actions:
        </h3>
        <div className="grid grid-cols-1 gap-2">
          <button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            📋 Copy Suggested Fix
          </button>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            ✓ Mark as Resolved
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            🤖 Generate Alternative
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            📝 Add Note
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            ⏭️ Next Risk →
          </button>
        </div>
      </div>
    </div>
  );
}