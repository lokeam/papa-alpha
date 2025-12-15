
export // Next Steps Component
function NextSteps({ steps }: { steps: string[] }) {
  return (
    <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-900 mb-8">
      <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
        Next Steps
      </h2>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-3 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
            <span className="font-medium text-gray-900 dark:text-white shrink-0">
              {index + 1}.
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
