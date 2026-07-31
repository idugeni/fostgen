import { AppError } from '@/lib/errors';
import { type RepoCoordinates } from '@/lib/github/types';

const SUPPORTED_HOSTS = new Set([
  'github.com',
  'www.github.com',
  'raw.githubusercontent.com',
  'api.github.com',
]);

/** GitHub logins: alphanumeric with single internal hyphens, max 39 chars. */
const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
/** Repository names allow dots and underscores in addition to hyphens. */
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

/** Route segments that come *after* `owner/repo` and carry a ref + path. */
const REF_BEARING_SEGMENTS = new Set(['tree', 'blob', 'blame', 'raw', 'commits']);

function invalid(hint: string): AppError {
  return new AppError('INVALID_URL', 'That does not look like a GitHub repository.', { hint });
}

/**
 * Turn the many shapes of "a GitHub repo" into a normalised URL string.
 *
 * Handles bare `owner/repo` shorthand, host-relative input, `git+` prefixes and
 * SCP-style SSH remotes (`git@github.com:owner/repo.git`).
 */
function normaliseInput(raw: string): string {
  let value = raw.trim().replace(/\s+/g, '');
  if (!value) throw invalid('Paste a repository URL such as https://github.com/owner/repo.');

  value = value.replace(/^git\+/, '');

  const scpMatch = /^(?:ssh:\/\/)?git@github\.com[:/](.+)$/i.exec(value);
  if (scpMatch?.[1]) {
    return `https://github.com/${scpMatch[1].replace(/^\/+/, '')}`;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
  if (/^(?:www\.)?github\.com\//i.test(value)) return `https://${value}`;
  if (/^raw\.githubusercontent\.com\//i.test(value)) return `https://${value}`;

  // Bare shorthand: `owner/repo` (optionally with a /tree/... suffix).
  return `https://github.com/${value.replace(/^\/+/, '')}`;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function splitRefAndPath(segments: readonly string[]): { ref?: string; path?: string } {
  const [first, ...rest] = segments;
  if (!first) return {};
  return {
    ref: first,
    ...(rest.length > 0 ? { path: rest.join('/') } : {}),
  };
}

/**
 * Parse arbitrary user input into repository coordinates.
 *
 * Because a branch name may itself contain slashes (`release/2026-07`), a URL
 * like `/tree/release/2026-07/src` is genuinely ambiguous. This function makes
 * the cheapest assumption — the first segment is the ref — and
 * {@link import('./client').resolveTree} widens the ref if that guess 404s.
 *
 * @throws {AppError} with code `INVALID_URL` when the input cannot be a repo.
 */
export function parseRepoUrl(input: string): RepoCoordinates {
  let url: URL;
  try {
    url = new URL(normaliseInput(input));
  } catch {
    throw invalid('Expected something like https://github.com/owner/repo.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw invalid('Only http(s) URLs are supported.');
  }

  const host = url.hostname.toLowerCase();
  if (!SUPPORTED_HOSTS.has(host)) {
    throw invalid(`${url.hostname} is not a GitHub host. Only github.com repositories work.`);
  }

  let segments = url.pathname.split('/').filter(Boolean).map(decodeSegment);

  // api.github.com/repos/owner/repo/...
  if (host === 'api.github.com') {
    if (segments[0] !== 'repos') throw invalid('Use the repository URL, not an arbitrary API path.');
    segments = segments.slice(1);
  }

  const [ownerSegment, repoSegment, ...rest] = segments;
  if (!ownerSegment || !repoSegment) {
    throw invalid('The URL is missing the owner or the repository name.');
  }

  const owner = ownerSegment;
  const repo = repoSegment.replace(/\.git$/i, '');

  if (!OWNER_PATTERN.test(owner)) {
    throw invalid(`"${owner}" is not a valid GitHub owner name.`);
  }
  if (!REPO_PATTERN.test(repo) || repo === '.' || repo === '..') {
    throw invalid(`"${repo}" is not a valid repository name.`);
  }

  // raw.githubusercontent.com/owner/repo/<ref>/<path...>
  if (host === 'raw.githubusercontent.com') {
    return { owner, repo, ...splitRefAndPath(rest) };
  }

  const [kind, ...tail] = rest;
  if (kind && REF_BEARING_SEGMENTS.has(kind)) {
    return { owner, repo, ...splitRefAndPath(tail) };
  }

  // Anything else (/issues, /pulls, /settings, …) is irrelevant to the tree.
  return { owner, repo };
}

/** `https://github.com/owner/repo` for a set of coordinates. */
export function repositoryUrl(coordinates: Pick<RepoCoordinates, 'owner' | 'repo'>): string {
  return `https://github.com/${coordinates.owner}/${coordinates.repo}`;
}

/** Best-effort display label, e.g. `owner/repo@main:src`. */
export function formatCoordinates(coordinates: RepoCoordinates): string {
  const base = `${coordinates.owner}/${coordinates.repo}`;
  const withRef = coordinates.ref ? `${base}@${coordinates.ref}` : base;
  return coordinates.path ? `${withRef}:${coordinates.path}` : withRef;
}
