'use client';

import { useTheme } from 'next-themes';

export // Next Steps Component
function NextSteps({ steps }: { steps: string[] }) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        borderColor: 'hsl(var(--card-border))',
        boxShadow: theme === 'dark' ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
      }}
      className="border rounded-lg p-6 bg-card mb-8"
    >
      <h2 className="text-2xl font-semibold text-primary mb-4">
        Next Steps
      </h2>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-3 text-sm text-secondary leading-relaxed">
            <span className="font-medium text-primary shrink-0">
              {index + 1}.
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
