'use client';

type FilterOption = {
  label: string;
  value: string;
};

type FilterBarProps = {
  filters: {
    label: string;
    options: FilterOption[];
    value?: string;
    onChange?: (value: string) => void;
  }[];
};

export function FilterBar({ filters }: FilterBarProps) {
  return (
    <div className="mb-4 p-3 border rounded-lg bg-card" style={{ borderColor: 'hsl(var(--card-border))' }}>
      <div className="flex gap-3 text-sm flex-wrap">
        {filters.map((filter, index) => (
          <select
            key={index}
            value={filter.value}
            onChange={(e) => filter.onChange?.(e.target.value)}
            className="px-2 py-1 border rounded bg-card text-foreground"
            style={{ borderColor: 'hsl(var(--card-border))' }}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}