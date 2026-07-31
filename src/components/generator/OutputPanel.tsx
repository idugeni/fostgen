'use client';

import { Check, Copy, Download, FileCode2, FolderTree, WrapText } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/Button';
import { formatBytes, formatCount } from '@/lib/format/units';
import { OUTPUT_FORMAT_META, type OutputFormat } from '@/lib/tree/render';
import { type TreeStats } from '@/lib/tree/stats';
import { cn } from '@/lib/utils/cn';

export interface OutputPanelProps {
  output: string;
  format: OutputFormat;
  stats: TreeStats | null;
  loading: boolean;
  copied: boolean;
  wrapLines: boolean;
  onToggleWrap: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export function OutputPanel({
  output,
  format,
  stats,
  loading,
  copied,
  wrapLines,
  onToggleWrap,
  onCopy,
  onDownload,
}: OutputPanelProps) {
  const lineCount = useMemo(() => (output ? output.split('\n').length : 0), [output]);
  const hasOutput = output.length > 0;

  return (
    <section aria-label="Generated structure" className="rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2 aria-hidden className="size-4 shrink-0 text-ink-subtle" />
          <h2 className="text-sm font-semibold text-ink">
            {OUTPUT_FORMAT_META[format].label}
          </h2>
          {hasOutput ? (
            <span className="font-mono text-xs text-ink-subtle">{lineCount} lines</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleWrap}
            aria-pressed={wrapLines}
            icon={<WrapText aria-hidden className="size-4" />}
            disabled={!hasOutput}
          >
            <span className="sr-only sm:not-sr-only">Wrap</span>
          </Button>
          <Button
            size="sm"
            onClick={onCopy}
            disabled={!hasOutput}
            icon={
              copied ? (
                <Check aria-hidden className="size-4 text-success" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )
            }
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            size="sm"
            onClick={onDownload}
            disabled={!hasOutput}
            icon={<Download aria-hidden className="size-4" />}
          >
            <span className="sr-only sm:not-sr-only">Download</span>
          </Button>
        </div>
      </header>

      {stats ? <StatsRow stats={stats} /> : null}

      <div className="p-5 pt-4">
        {loading ? (
          <TreeSkeleton />
        ) : hasOutput ? (
          <pre
            data-testid="structure-output"
            tabIndex={0}
            className={cn(
              'max-h-[32rem] overflow-auto rounded-xl bg-elevated p-4 font-mono text-[0.8125rem] leading-relaxed text-ink',
              wrapLines ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
            )}
          >
            {output}
          </pre>
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function StatsRow({ stats }: { stats: TreeStats }) {
  const items: Array<{ label: string; value: string }> = [
    { label: 'Folders', value: formatCount(stats.directories) },
    { label: 'Files', value: formatCount(stats.files) },
    { label: 'Depth', value: String(stats.maxDepth) },
  ];

  if (stats.totalSize > 0) items.push({ label: 'Size', value: formatBytes(stats.totalSize) });
  if (stats.submodules > 0) {
    items.push({ label: 'Submodules', value: formatCount(stats.submodules) });
  }

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 border-b border-line px-5 py-2.5 text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <dt className="text-ink-subtle">{item.label}</dt>
          <dd className="font-mono font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const SKELETON_WIDTHS = ['55%', '38%', '72%', '46%', '62%', '30%', '68%', '42%'];

function TreeSkeleton() {
  return (
    <div aria-hidden className="space-y-2.5 rounded-xl bg-elevated p-4">
      {SKELETON_WIDTHS.map((width, index) => (
        <div
          key={`${width}-${index}`}
          className="h-3 animate-pulse rounded-full bg-line"
          style={{ width, marginLeft: `${(index % 3) * 1.25}rem` }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-6 py-14 text-center">
      <FolderTree aria-hidden className="size-8 text-ink-subtle" />
      <p className="text-sm font-medium text-ink">No structure yet</p>
      <p className="max-w-sm text-xs text-ink-subtle">
        Paste a repository above and press Generate. Everything after that — format, depth, ignore
        rules — updates instantly without another request.
      </p>
    </div>
  );
}
