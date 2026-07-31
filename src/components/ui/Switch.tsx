'use client';

import { useId } from 'react';

import { cn } from '@/lib/utils/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A labelled toggle built on a real `role="switch"` button so screen readers
 * announce state, and the whole row is clickable.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchProps) {
  const descriptionId = useId();

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink">{label}</span>
        {description ? (
          <span id={descriptionId} className="text-xs text-ink-subtle">
            {description}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'border-transparent bg-brand' : 'border-line bg-elevated',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'inline-block size-3.5 rounded-full bg-surface shadow-sm transition-transform',
            checked ? 'translate-x-[1.15rem]' : 'translate-x-[0.15rem]',
          )}
        />
      </button>
    </div>
  );
}
