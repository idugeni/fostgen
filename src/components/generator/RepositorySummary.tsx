import {
  AlertTriangle,
  Archive,
  Circle,
  Clock,
  ExternalLink,
  GitBranch,
  GitFork,
  Scale,
  Star,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { formatCount, formatRelativeTime } from '@/lib/format/units';
import { type RateLimitInfo, type RepositoryMeta } from '@/lib/github/types';

export interface RepositorySummaryProps {
  repository: RepositoryMeta;
  /** Named `gitRef` rather than `ref`, which React treats specially. */
  gitRef: string;
  path: string | null;
  truncated: boolean;
  rateLimit: RateLimitInfo | null;
}

export function RepositorySummary({
  repository,
  gitRef,
  path,
  truncated,
  rateLimit,
}: RepositorySummaryProps) {
  const updated = formatRelativeTime(repository.pushedAt ?? repository.updatedAt);

  return (
    <section aria-label="Repository details" className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={repository.htmlUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 font-mono text-base font-semibold text-ink transition-colors hover:text-brand"
          >
            {repository.fullName}
            <ExternalLink aria-hidden className="size-3.5 text-ink-subtle" />
          </a>
          {repository.description ? (
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">{repository.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge tone="brand" icon={<GitBranch aria-hidden className="size-3" />}>
            {gitRef}
          </Badge>
          {path ? (
            <Badge icon={<span aria-hidden className="font-mono">/</span>}>{path}</Badge>
          ) : null}
          {repository.isArchived ? (
            <Badge tone="warning" icon={<Archive aria-hidden className="size-3" />}>
              archived
            </Badge>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted">
        <Fact icon={<Star aria-hidden className="size-3.5" />} label="Stars">
          {formatCount(repository.stars)}
        </Fact>
        <Fact icon={<GitFork aria-hidden className="size-3.5" />} label="Forks">
          {formatCount(repository.forks)}
        </Fact>
        {repository.language ? (
          <Fact icon={<Circle aria-hidden className="size-3.5" />} label="Language">
            {repository.language}
          </Fact>
        ) : null}
        {repository.license ? (
          <Fact icon={<Scale aria-hidden className="size-3.5" />} label="License">
            {repository.license}
          </Fact>
        ) : null}
        {updated ? (
          <Fact icon={<Clock aria-hidden className="size-3.5" />} label="Last push">
            {updated}
          </Fact>
        ) : null}
      </dl>

      {truncated ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-warning/35 bg-warning-soft px-3 py-2 text-xs text-warning">
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            GitHub truncated this tree because the repository is very large, so some deeply nested
            entries are missing. Scope the request to a sub-directory for a complete listing.
          </span>
        </p>
      ) : null}

      {rateLimit && !rateLimit.authenticated && rateLimit.remaining <= 10 ? (
        <p className="mt-3 text-xs text-ink-subtle">
          {rateLimit.remaining} of {rateLimit.limit} anonymous GitHub API requests left in this
          window. Configure a <code className="font-mono">GITHUB_TOKEN</code> to raise the limit.
        </p>
      ) : null}
    </section>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <dt className="sr-only">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
