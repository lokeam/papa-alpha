'use client';

type ImpactMetric = {
  label: string;
  value: string;
  highlight?: boolean;
};

type ImpactAssessmentProps = {
  metrics: ImpactMetric[];
};

export function ImpactAssessment({ metrics }: ImpactAssessmentProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
        📊 Impact Assessment:
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {metrics.map((metric, index) => (
          <div key={index} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-zinc-400">
              {metric.label}:
            </div>
            <div className={
              metric.highlight
                ? "font-semibold text-rose-600 dark:text-rose-400 uppercase"
                : "font-semibold text-gray-900 dark:text-white"
            }>
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}