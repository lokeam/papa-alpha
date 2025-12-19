'use client';

import { SunIcon } from '@/components/ui/icons/SunIcon';
import { MoonIcon } from '@/components/ui/icons/MoonIcon';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="relative flex items-center justify-center size-10 rounded-md hover:bg-accent transition-colors cursor-pointer"
        aria-label="Toggle theme"
      >
        <div className="size-6" />
      </button>
    );
  }

  const isDark = theme === 'dark';

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