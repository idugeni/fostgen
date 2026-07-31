'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useId } from 'react';

import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { DEFAULT_IGNORE_PATTERNS, MAX_DEPTH_CEILING, type GeneratorOptions } from '@/lib/config';
import { parsePatternList } from '@/lib/tree/filter';
import { OUTPUT_FORMAT_META, OUTPUT_FORMATS, type OutputFormat } from '@/lib/tree/render';
import { SORT_MODE_LABELS, SORT_MODES, type SortMode } from '@/lib/tree/sort';

export interface OptionsPanelProps {
  options: GeneratorOptions;
  onChange: (patch: Partial<GeneratorOptions>) => void;
  onResetDefaults: () => void;
}

const FORMAT_OPTIONS = OUTPUT_FORMATS.map((format) => ({
  value: format,
  label: OUTPUT_FORMAT_META[format].label,
}));

const SORT_OPTIONS = SORT_MODES.map((mode) => ({
  value: mode,
  label: SORT_MODE_LABELS[mode],
}));

export function OptionsPanel({ options, onChange, onResetDefaults }: OptionsPanelProps) {
  const depthId = useId();
  const ignoreId = useId();
  const format = options.format;
  const fenceSupported = OUTPUT_FORMAT_META[format].supportsFence;

  return (
    <section
      aria-labelledby={`${depthId}-heading`}
      // `@container` + `@sm:` breakpoints: this panel is a narrow sidebar on large
      // screens and full width below it, so the layout has to react to its own
      // width rather than the viewport.
      className="@container rounded-2xl border border-line bg-surface p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id={`${depthId}-heading`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink"
        >
          <SlidersHorizontal aria-hidden className="size-4 text-ink-subtle" />
          Output options
        </h2>
        <button
          type="button"
          onClick={onResetDefaults}
          className="text-xs text-ink-subtle underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-4 @sm:grid-cols-2">
        <Select<OutputFormat>
          label="Format"
          value={format}
          options={FORMAT_OPTIONS}
          onValueChange={(value) => onChange({ format: value })}
          hint={OUTPUT_FORMAT_META[format].description}
        />
        <Select<SortMode>
          label="Order"
          value={options.sort}
          options={SORT_OPTIONS}
          onValueChange={(value) => onChange({ sort: value })}
          hint="How siblings are arranged at every level."
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={depthId} className="text-sm font-medium text-ink">
            Depth
          </label>
          <span className="font-mono text-xs text-ink-muted">
            {options.maxDepth === null ? 'unlimited' : `${options.maxDepth} level${options.maxDepth === 1 ? '' : 's'}`}
          </span>
        </div>
        <input
          id={depthId}
          type="range"
          min={1}
          max={MAX_DEPTH_CEILING + 1}
          step={1}
          value={options.maxDepth ?? MAX_DEPTH_CEILING + 1}
          onChange={(event) => {
            const raw = Number(event.target.value);
            onChange({ maxDepth: raw > MAX_DEPTH_CEILING ? null : raw });
          }}
          aria-valuetext={options.maxDepth === null ? 'Unlimited' : `${options.maxDepth} levels`}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-elevated accent-brand"
        />
      </div>

      <div className="mt-5 grid gap-4 @sm:grid-cols-2">
        <Switch
          label="Include files"
          description="Off shows the folder skeleton only."
          checked={options.includeFiles}
          onCheckedChange={(checked) => onChange({ includeFiles: checked })}
        />
        <Switch
          label="Show sizes"
          description="Folders show the sum of their contents."
          checked={options.showSizes}
          onCheckedChange={(checked) => onChange({ showSizes: checked })}
        />
        <Switch
          label="Trailing slash"
          description="Mark directories with a /."
          checked={options.trailingSlash}
          onCheckedChange={(checked) => onChange({ trailingSlash: checked })}
        />
        <Switch
          label="Wrap in code fence"
          description={
            fenceSupported
              ? 'Ready to paste into a README.'
              : `Not applicable to ${OUTPUT_FORMAT_META[format].label}.`
          }
          checked={options.fenced && fenceSupported}
          disabled={!fenceSupported}
          onCheckedChange={(checked) => onChange({ fenced: checked })}
        />
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <Switch
          label="Skip common noise"
          description={`Hides ${DEFAULT_IGNORE_PATTERNS.length} defaults such as node_modules and lock files.`}
          checked={options.applyDefaultIgnores}
          onCheckedChange={(checked) => onChange({ applyDefaultIgnores: checked })}
        />

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={ignoreId} className="text-sm font-medium text-ink">
            Extra ignore patterns
          </label>
          <textarea
            id={ignoreId}
            rows={2}
            spellCheck={false}
            placeholder="*.test.ts, docs/**, !docs/api"
            value={options.ignorePatterns.join('\n')}
            onChange={(event) => onChange({ ignorePatterns: parsePatternList(event.target.value) })}
            className="resize-y rounded-xl border border-line bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:font-sans placeholder:text-ink-subtle hover:border-line-strong"
          />
          <p className="text-xs text-ink-subtle">
            One per line or comma separated. Supports <code className="font-mono">*</code>,{' '}
            <code className="font-mono">**</code>, a trailing <code className="font-mono">/</code>{' '}
            for folders and <code className="font-mono">!</code> to re-include.
          </p>
        </div>
      </div>
    </section>
  );
}
