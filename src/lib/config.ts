import { OUTPUT_FORMATS, type OutputFormat } from '@/lib/tree/render';
import { SORT_MODES, type SortMode } from '@/lib/tree/sort';

/**
 * Resolve the public origin without hardcoding a deploy target.
 *
 * Order of precedence: explicit env var, Vercel's production URL, then
 * localhost so that `next build` never bakes a wrong absolute URL into
 * sitemap/robots output.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}

export const siteConfig = {
  name: 'FostGen',
  tagline: 'Folder Structure Generator',
  description:
    'Turn any public GitHub repository into a clean, shareable folder structure — as an ASCII tree, Markdown, JSON, YAML or a flat path list.',
  repository: 'https://github.com/idugeni/fostgen',
  author: 'idugeni',
} as const;

/** Directories and files that are noise in almost every structure dump. */
export const DEFAULT_IGNORE_PATTERNS = [
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '*.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
] as const;

/** Depth ceiling exposed by the UI slider; `null` in state means "unlimited". */
export const MAX_DEPTH_CEILING = 12;

export interface GeneratorOptions {
  format: OutputFormat;
  sort: SortMode;
  maxDepth: number | null;
  includeFiles: boolean;
  showSizes: boolean;
  trailingSlash: boolean;
  fenced: boolean;
  applyDefaultIgnores: boolean;
  ignorePatterns: string[];
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  format: 'ascii',
  sort: 'dirs-first',
  maxDepth: null,
  includeFiles: true,
  showSizes: false,
  trailingSlash: true,
  fenced: true,
  applyDefaultIgnores: true,
  ignorePatterns: [],
};

export const EXAMPLE_REPOSITORIES = [
  'vercel/next.js',
  'facebook/react',
  'tailwindlabs/tailwindcss',
  'idugeni/fostgen',
] as const;

/** How long the server may reuse a cached GitHub response, in seconds. */
export const GITHUB_CACHE_TTL_SECONDS = 300;

export const RECENT_REPOS_STORAGE_KEY = 'fostgen:recent-repositories';
export const OPTIONS_STORAGE_KEY = 'fostgen:generator-options';
export const THEME_STORAGE_KEY = 'fostgen:theme';
export const MAX_RECENT_REPOSITORIES = 6;


/**
 * Validate a persisted options blob.
 *
 * Anything unknown falls back to the default for that single field, so a schema
 * change (or a hand-edited localStorage entry) degrades gracefully instead of
 * throwing at render time.
 */
export function parseGeneratorOptions(value: unknown): GeneratorOptions | null {
  if (typeof value !== 'object' || value === null) return null;

  const input = value as Record<string, unknown>;
  const defaults = DEFAULT_GENERATOR_OPTIONS;

  const pickString = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const candidate = input[key];
    return typeof candidate === 'string' && (allowed as readonly string[]).includes(candidate)
      ? (candidate as T)
      : fallback;
  };

  const pickBoolean = (key: string, fallback: boolean): boolean =>
    typeof input[key] === 'boolean' ? (input[key] as boolean) : fallback;

  const depth = input.maxDepth;
  const maxDepth =
    depth === null
      ? null
      : typeof depth === 'number' && Number.isInteger(depth) && depth >= 1 && depth <= MAX_DEPTH_CEILING
        ? depth
        : defaults.maxDepth;

  return {
    format: pickString('format', OUTPUT_FORMATS, defaults.format),
    sort: pickString('sort', SORT_MODES, defaults.sort),
    maxDepth,
    includeFiles: pickBoolean('includeFiles', defaults.includeFiles),
    showSizes: pickBoolean('showSizes', defaults.showSizes),
    trailingSlash: pickBoolean('trailingSlash', defaults.trailingSlash),
    fenced: pickBoolean('fenced', defaults.fenced),
    applyDefaultIgnores: pickBoolean('applyDefaultIgnores', defaults.applyDefaultIgnores),
    ignorePatterns: Array.isArray(input.ignorePatterns)
      ? input.ignorePatterns.filter((item): item is string => typeof item === 'string')
      : defaults.ignorePatterns,
  };
}

/** Validate the persisted "recent repositories" list. */
export function parseRecentRepositories(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .slice(0, MAX_RECENT_REPOSITORIES);
}
