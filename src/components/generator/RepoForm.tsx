'use client';

import { ChevronDown, FolderTree, RotateCcw, Sparkles } from 'lucide-react';
import { useId, useState, type FormEvent, type RefObject } from 'react';

import { GithubMark } from '@/components/icons/GithubMark';
import { Button } from '@/components/ui/Button';
import { EXAMPLE_REPOSITORIES } from '@/lib/config';
import { cn } from '@/lib/utils/cn';

export interface RepoFormValues {
  url: string;
  ref: string;
  path: string;
}

export interface RepoFormProps {
  values: RepoFormValues;
  onChange: (patch: Partial<RepoFormValues>) => void;
  onSubmit: () => void;
  onReset: () => void;
  loading: boolean;
  canReset: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Client-side validation message shown under the field. */
  validationMessage?: string;
}

export function RepoForm({
  values,
  onChange,
  onSubmit,
  onReset,
  loading,
  canReset,
  inputRef,
  validationMessage,
}: RepoFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(
    () => values.ref.length > 0 || values.path.length > 0,
  );
  const urlId = useId();
  const errorId = `${urlId}-error`;
  const refId = `${urlId}-ref`;
  const pathId = `${urlId}-path`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={urlId} className="text-sm font-medium text-ink">
          GitHub repository
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <GithubMark className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              id={urlId}
              ref={inputRef}
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              placeholder="owner/repo or https://github.com/owner/repo"
              value={values.url}
              onChange={(event) => onChange({ url: event.target.value })}
              aria-invalid={validationMessage ? true : undefined}
              aria-describedby={validationMessage ? errorId : undefined}
              className={cn(
                'h-11 w-full rounded-xl border bg-surface pr-3 pl-10 text-sm text-ink',
                'placeholder:text-ink-subtle',
                validationMessage ? 'border-danger' : 'border-line hover:border-line-strong',
              )}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={<FolderTree aria-hidden className="size-4" />}
              className="flex-1 sm:flex-none"
            >
              {loading ? 'Generating…' : 'Generate'}
            </Button>
            {canReset ? (
              <Button
                onClick={onReset}
                icon={<RotateCcw aria-hidden className="size-4" />}
                aria-label="Clear the form and results"
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
        {validationMessage ? (
          <p id={errorId} role="alert" className="text-xs text-danger">
            {validationMessage}
          </p>
        ) : (
          <p className="text-xs text-ink-subtle">
            Accepts shorthand, full URLs, SSH remotes and deep links such as{' '}
            <code className="font-mono">/tree/main/src</code>.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
          <Sparkles aria-hidden className="size-3.5" />
          Try
        </span>
        {EXAMPLE_REPOSITORIES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onChange({ url: example, ref: '', path: '' })}
            className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronDown
            aria-hidden
            className={cn('size-3.5 transition-transform', advancedOpen && 'rotate-180')}
          />
          Branch &amp; sub-directory
        </button>

        {advancedOpen ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={refId} className="text-xs font-medium text-ink-muted">
                Branch, tag or commit
              </label>
              <input
                id={refId}
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="default branch"
                value={values.ref}
                onChange={(event) => onChange({ ref: event.target.value })}
                className="h-10 rounded-xl border border-line bg-surface px-3 font-mono text-sm text-ink placeholder:font-sans placeholder:text-ink-subtle hover:border-line-strong"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={pathId} className="text-xs font-medium text-ink-muted">
                Sub-directory
              </label>
              <input
                id={pathId}
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="repository root"
                value={values.path}
                onChange={(event) => onChange({ path: event.target.value })}
                className="h-10 rounded-xl border border-line bg-surface px-3 font-mono text-sm text-ink placeholder:font-sans placeholder:text-ink-subtle hover:border-line-strong"
              />
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
