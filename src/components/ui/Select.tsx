'use client';

import { ChevronDown } from 'lucide-react';
import { useId, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export interface SelectOption<TValue extends string> {
  value: TValue;
  label: string;
  hint?: string;
}

export interface SelectProps<TValue extends string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  label: string;
  value: TValue;
  options: ReadonlyArray<SelectOption<TValue>>;
  onValueChange: (value: TValue) => void;
  hint?: string;
}

/**
 * A native `<select>` with app styling. Native beats a custom listbox here: it
 * is keyboard- and screen-reader-correct for free, and mobile gets the OS picker.
 */
export function Select<TValue extends string>({
  label,
  value,
  options,
  onValueChange,
  hint,
  className,
  ...rest
}: SelectProps<TValue>) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onValueChange(event.target.value as TValue)}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            'h-10 w-full appearance-none rounded-xl border border-line bg-surface px-3 pr-9',
            'text-sm text-ink transition-colors hover:border-line-strong',
          )}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-subtle"
        />
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
