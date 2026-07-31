'use client';

import { History, X } from 'lucide-react';

export interface RecentRepositoriesProps {
  items: readonly string[];
  onSelect: (item: string) => void;
  onRemove: (item: string) => void;
  onClear: () => void;
}

export function RecentRepositories({
  items,
  onSelect,
  onRemove,
  onClear,
}: RecentRepositoriesProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading" className="flex flex-wrap items-center gap-2">
      <h2
        id="recent-heading"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-subtle"
      >
        <History aria-hidden className="size-3.5" />
        Recent
      </h2>

      <ul className="flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-center overflow-hidden rounded-full border border-line">
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="py-0.5 pl-2.5 font-mono text-xs text-ink-muted transition-colors hover:text-ink"
            >
              {item}
            </button>
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item} from recent repositories`}
              className="px-1.5 py-1 text-ink-subtle transition-colors hover:text-danger"
            >
              <X aria-hidden className="size-3" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onClear}
        className="text-xs text-ink-subtle underline-offset-2 transition-colors hover:text-ink hover:underline"
      >
        Clear all
      </button>
    </section>
  );
}
