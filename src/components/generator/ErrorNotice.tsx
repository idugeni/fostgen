import { AlertOctagon } from 'lucide-react';

import { type StructureError } from '@/hooks/useRepoStructure';

/**
 * Inline, persistent counterpart to the transient toast. Errors stay visible
 * here so the user can read the hint at their own pace.
 */
export function ErrorNotice({ error }: { error: StructureError }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-danger/35 bg-danger-soft px-5 py-4"
    >
      <AlertOctagon aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-danger">{error.message}</p>
        {error.hint ? <p className="mt-1 text-xs text-ink-muted">{error.hint}</p> : null}
        <p className="mt-2 font-mono text-[0.6875rem] text-ink-subtle">{error.code}</p>
      </div>
    </div>
  );
}
