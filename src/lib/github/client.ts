import { GITHUB_CACHE_TTL_SECONDS } from '@/lib/config';
import { AppError, toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  type GitTreeEntry,
  type GitTreeEntryType,
  type RateLimitInfo,
  type RepoCoordinates,
  type RepositoryMeta,
} from '@/lib/github/types';

const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'fostgen/3 (+https://github.com/idugeni/fostgen)';

/** How many extra segments we are willing to fold into a slash-y branch name. */
const MAX_REF_WIDENING_ATTEMPTS = 3;

interface RequestOptions {
  signal?: AbortSignal;
  revalidate?: number;
}

interface RequestResult<T> {
  data: T;
  status: number;
  rateLimit: RateLimitInfo | null;
}

function readRateLimit(headers: Headers, authenticated: boolean): RateLimitInfo | null {
  const limit = Number(headers.get('x-ratelimit-limit'));
  const remaining = Number(headers.get('x-ratelimit-remaining'));
  const reset = Number(headers.get('x-ratelimit-reset'));

  if (!Number.isFinite(limit) || !Number.isFinite(remaining) || !Number.isFinite(reset)) {
    return null;
  }

  return { limit, remaining, reset, authenticated };
}

function rateLimitError(rateLimit: RateLimitInfo | null): AppError {
  const resetInSeconds = rateLimit
    ? Math.max(0, Math.round(rateLimit.reset - Date.now() / 1000))
    : undefined;

  const minutes = resetInSeconds === undefined ? undefined : Math.ceil(resetInSeconds / 60);
  const when = minutes === undefined ? 'in a little while' : `in about ${minutes} min`;

  return new AppError(
    'RATE_LIMITED',
    `GitHub API rate limit reached. Try again ${when}.`,
    {
      hint: rateLimit?.authenticated
        ? 'The configured token has exhausted its quota.'
        : 'Set a GITHUB_TOKEN environment variable to raise the limit from 60 to 5,000 requests per hour.',
      ...(resetInSeconds === undefined ? {} : { retryAfter: resetInSeconds }),
    },
  );
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<RequestResult<T>> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const authenticated = Boolean(token);

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      headers,
      ...(options.signal ? { signal: options.signal } : {}),
      next: { revalidate: options.revalidate ?? GITHUB_CACHE_TTL_SECONDS },
    });
  } catch (cause) {
    const error = toAppError(cause);
    if (error.code === 'ABORTED') throw error;
    throw new AppError('NETWORK', 'Could not reach the GitHub API.', {
      hint: 'Check the network connection and try again.',
      cause,
    });
  }

  const rateLimit = readRateLimit(response.headers, authenticated);

  if (response.ok) {
    return { data: (await response.json()) as T, status: response.status, rateLimit };
  }

  if (response.status === 401) {
    throw new AppError('UNAUTHORIZED', 'GitHub rejected the configured credentials.', {
      hint: 'The GITHUB_TOKEN is missing the required scope, or has expired.',
    });
  }

  if (response.status === 429 || (response.status === 403 && rateLimit?.remaining === 0)) {
    throw rateLimitError(rateLimit);
  }

  if (response.status === 403) {
    throw new AppError('UNAUTHORIZED', 'GitHub refused the request.', {
      hint: 'The repository may be private, or access is blocked for this client.',
    });
  }

  if (response.status === 404) {
    throw new AppError('NOT_FOUND', 'Repository not found.', {
      hint: 'Check the spelling — private repositories require a GITHUB_TOKEN with access.',
      status: 404,
    });
  }

  if (response.status === 451) {
    throw new AppError('UNAVAILABLE', 'This repository is unavailable for legal reasons.');
  }

  logger.warn('Unexpected GitHub API response', { path, status: response.status });
  throw new AppError('UPSTREAM', `GitHub responded with ${response.status}.`, {
    hint: 'This is usually transient. Please retry shortly.',
  });
}

interface RawRepository {
  name: string;
  full_name: string;
  owner?: { login?: string } | null;
  description: string | null;
  default_branch?: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  license?: { spdx_id?: string | null; name?: string | null } | null;
  topics?: string[] | null;
  stargazers_count?: number;
  forks_count?: number;
  subscribers_count?: number;
  watchers_count?: number;
  open_issues_count?: number;
  size?: number;
  fork?: boolean;
  archived?: boolean;
  is_template?: boolean;
  pushed_at?: string | null;
  updated_at?: string | null;
}

function toRepositoryMeta(raw: RawRepository, fallbackOwner: string): RepositoryMeta {
  const license = raw.license?.spdx_id && raw.license.spdx_id !== 'NOASSERTION'
    ? raw.license.spdx_id
    : (raw.license?.name ?? null);

  return {
    owner: raw.owner?.login ?? fallbackOwner,
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description,
    defaultBranch: raw.default_branch || 'main',
    htmlUrl: raw.html_url,
    homepage: raw.homepage,
    language: raw.language,
    license,
    topics: raw.topics ?? [],
    stars: raw.stargazers_count ?? 0,
    forks: raw.forks_count ?? 0,
    watchers: raw.subscribers_count ?? raw.watchers_count ?? 0,
    openIssues: raw.open_issues_count ?? 0,
    sizeKb: raw.size ?? 0,
    isFork: raw.fork ?? false,
    isArchived: raw.archived ?? false,
    isTemplate: raw.is_template ?? false,
    pushedAt: raw.pushed_at ?? null,
    updatedAt: raw.updated_at ?? null,
  };
}

export async function fetchRepository(
  owner: string,
  repo: string,
  options: RequestOptions = {},
): Promise<{ repository: RepositoryMeta; rateLimit: RateLimitInfo | null }> {
  const { data, rateLimit } = await request<RawRepository>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    options,
  );

  return { repository: toRepositoryMeta(data, owner), rateLimit };
}

interface RawTreeResponse {
  sha?: string;
  truncated?: boolean;
  tree?: Array<{ path?: string; type?: string; size?: number; sha?: string; mode?: string }>;
}

function isEntryType(value: string | undefined): value is GitTreeEntryType {
  return value === 'blob' || value === 'tree' || value === 'commit';
}

function toEntries(raw: RawTreeResponse): GitTreeEntry[] {
  if (!Array.isArray(raw.tree)) {
    throw new AppError('UPSTREAM', 'GitHub returned an unexpected tree payload.');
  }

  const entries: GitTreeEntry[] = [];
  for (const item of raw.tree) {
    if (typeof item.path !== 'string' || item.path.length === 0) continue;
    if (!isEntryType(item.type)) continue;
    entries.push({
      path: item.path,
      type: item.type,
      ...(typeof item.size === 'number' ? { size: item.size } : {}),
      ...(item.sha ? { sha: item.sha } : {}),
      ...(item.mode ? { mode: item.mode } : {}),
    });
  }
  return entries;
}

export async function fetchTree(
  owner: string,
  repo: string,
  ref: string,
  options: RequestOptions = {},
): Promise<{
  entries: GitTreeEntry[];
  truncated: boolean;
  sha: string | null;
  rateLimit: RateLimitInfo | null;
}> {
  const { data, rateLimit } = await request<RawTreeResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    options,
  );

  return {
    entries: toEntries(data),
    truncated: data.truncated === true,
    sha: data.sha ?? null,
    rateLimit,
  };
}

/** Candidate `(ref, path)` splits for input where the branch may contain slashes. */
function refCandidates(ref: string, path: string | undefined): Array<{ ref: string; path?: string }> {
  const segments = path ? path.split('/').filter(Boolean) : [];
  const candidates: Array<{ ref: string; path?: string }> = [
    { ref, ...(segments.length > 0 ? { path: segments.join('/') } : {}) },
  ];

  const widenBy = Math.min(MAX_REF_WIDENING_ATTEMPTS, segments.length);
  for (let taken = 1; taken <= widenBy; taken += 1) {
    const remaining = segments.slice(taken);
    candidates.push({
      ref: [ref, ...segments.slice(0, taken)].join('/'),
      ...(remaining.length > 0 ? { path: remaining.join('/') } : {}),
    });
  }

  return candidates;
}

export interface ResolvedStructure {
  repository: RepositoryMeta;
  ref: string;
  path: string | null;
  entries: GitTreeEntry[];
  truncated: boolean;
  treeSha: string | null;
  rateLimit: RateLimitInfo | null;
}

/**
 * Fetch a repository's metadata and its full recursive tree.
 *
 * Resolution order:
 * 1. metadata (also gives us the default branch),
 * 2. the tree for the requested ref, widening the ref when the caller's
 *    `tree/<a>/<b>` split guessed the branch boundary wrong,
 * 3. scoping to a sub-directory, which is validated against the entries so a
 *    typo produces `PATH_NOT_FOUND` instead of a silently empty tree.
 */
export async function resolveStructure(
  coordinates: RepoCoordinates,
  options: RequestOptions = {},
): Promise<ResolvedStructure> {
  const { owner, repo } = coordinates;
  const { repository, rateLimit: repoRateLimit } = await fetchRepository(owner, repo, options);

  const requestedRef = coordinates.ref?.trim() || repository.defaultBranch;
  const candidates = coordinates.ref
    ? refCandidates(requestedRef, coordinates.path)
    : [{ ref: requestedRef, ...(coordinates.path ? { path: coordinates.path } : {}) }];

  let lastError: AppError | null = null;

  for (const candidate of candidates) {
    try {
      const tree = await fetchTree(owner, repo, candidate.ref, options);

      if (tree.entries.length === 0) {
        throw new AppError('EMPTY_REPOSITORY', `"${repository.fullName}" has no files on ${candidate.ref}.`);
      }

      const scoped = scopeToPath(tree.entries, candidate.path);

      return {
        repository,
        ref: candidate.ref,
        path: candidate.path ?? null,
        entries: scoped,
        truncated: tree.truncated,
        treeSha: tree.sha,
        rateLimit: tree.rateLimit ?? repoRateLimit,
      };
    } catch (cause) {
      const error = toAppError(cause);
      if (error.code !== 'NOT_FOUND') throw error;
      lastError = error;
    }
  }

  throw new AppError(
    'BRANCH_NOT_FOUND',
    `"${requestedRef}" is not a branch, tag or commit in ${repository.fullName}.`,
    {
      hint: `The default branch is "${repository.defaultBranch}".`,
      ...(lastError ? { cause: lastError } : {}),
    },
  );
}

/** Restrict a flat entry list to a sub-directory, stripping the prefix. */
export function scopeToPath(entries: GitTreeEntry[], path: string | undefined): GitTreeEntry[] {
  const normalised = path?.replace(/^\/+|\/+$/g, '');
  if (!normalised) return entries;

  const prefix = `${normalised}/`;
  const scoped: GitTreeEntry[] = [];
  let self: GitTreeEntry | undefined;

  for (const entry of entries) {
    if (entry.path === normalised) {
      self = entry;
      continue;
    }
    if (entry.path.startsWith(prefix)) {
      scoped.push({ ...entry, path: entry.path.slice(prefix.length) });
    }
  }

  if (!self && scoped.length === 0) {
    throw new AppError('PATH_NOT_FOUND', `"${normalised}" does not exist in this repository.`, {
      hint: 'Check the sub-directory, or clear it to render the whole repository.',
    });
  }

  if (self && self.type !== 'tree' && scoped.length === 0) {
    throw new AppError('PATH_NOT_FOUND', `"${normalised}" is a file, not a directory.`, {
      hint: 'Point at a directory to render its structure.',
    });
  }

  return scoped;
}
