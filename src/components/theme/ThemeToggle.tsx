'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme, type ThemePreference } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils/cn';

const ICONS: Record<ThemePreference, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const LABELS: Record<ThemePreference, string> = {
  system: 'Theme: follows your system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, cycle } = useTheme();
  const Icon = ICONS[preference];

  return (
    <button
      type="button"
      onClick={cycle}
      title={LABELS[preference]}
      aria-label={`${LABELS[preference]}. Activate to change.`}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-lg border border-line',
        'text-ink-muted transition-colors hover:bg-elevated hover:text-ink',
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
