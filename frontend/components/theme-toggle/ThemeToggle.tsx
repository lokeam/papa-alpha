'use client';

import { SunIcon } from '@/components/ui/icons/SunIcon';
import { MoonIcon } from '@/components/ui/icons/MoonIcon';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // resolvedTheme is undefined until next-themes hydrates on the client.
  // Render an inert placeholder so SSR and first client render agree.
  if (!resolvedTheme) {
    return (
      <button
        className="relative flex items-center justify-center size-10 rounded-md hover:bg-accent transition-colors cursor-pointer"
        aria-label="Toggle theme"
      >
        <div className="size-6" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex items-center justify-center size-10 rounded-md hover:bg-accent transition-colors cursor-pointer group"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <MoonIcon
        className={`size-6 transition-all duration-300 ease-in-out group-hover:text-[rgb(136,19,55)] ${
          isDark
            ? 'scale-100 rotate-0 opacity-100'
            : 'scale-0 -rotate-90 opacity-0'
        }`}
      />
      <SunIcon
        className={`absolute size-6 transition-all duration-300 ease-in-out group-hover:text-[rgb(136,19,55)] ${
          !isDark
            ? 'scale-100 rotate-0 opacity-100'
            : 'scale-0 rotate-90 opacity-0'
        }`}
      />
    </button>
  );
};
