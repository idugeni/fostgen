import { type TreeNode } from '@/lib/tree/types';

export interface CompiledPattern {
  source: string;
  regex: RegExp;
  /** Match against the full relative path rather than just the base name. */
  matchPath: boolean;
  /** `foo/` only ever matches directories. */
  directoryOnly: boolean;
  /** `!foo` re-includes something an earlier pattern excluded. */
  negated: boolean;
}

const REGEX_SPECIALS = /[.+^${}()|[\]\\]/g;

function globToRegExp(glob: string): RegExp {
  let source = '';
  let index = 0;

  while (index < glob.length) {
    const char = glob[index] ?? '';

    if (char === '*') {
      const isGlobstar = glob[index + 1] === '*';

      if (isGlobstar && glob[index + 2] === '/') {
        // `**/foo` must also match a root-level `foo`, hence the optional group.
        source += '(?:.*/)?';
        index += 3;
        continue;
      }

      source += isGlobstar ? '.*' : '[^/]*';
      index += isGlobstar ? 2 : 1;
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      index += 1;
      continue;
    }

    source += char.replace(REGEX_SPECIALS, '\\$&');
    index += 1;
  }

  return new RegExp(`^${source}$`);
}

/**
 * Compile a gitignore-flavoured pattern list.
 *
 * Supported syntax: `*`, `**`, `?`, a trailing `/` for directory-only matches,
 * a leading `!` for negation, and `/` anywhere to switch from base-name
 * matching to full-path matching.
 */
export function compilePatterns(patterns: readonly string[]): CompiledPattern[] {
  const compiled: CompiledPattern[] = [];

  for (const raw of patterns) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const negated = trimmed.startsWith('!');
    let body = negated ? trimmed.slice(1) : trimmed;

    const directoryOnly = body.endsWith('/');
    if (directoryOnly) body = body.slice(0, -1);

    const anchored = body.startsWith('/');
    if (anchored) body = body.slice(1);
    if (!body) continue;

    const matchPath = anchored || body.includes('/');

    compiled.push({
      source: trimmed,
      regex: globToRegExp(body),
      matchPath,
      directoryOnly,
      negated,
    });
  }

  return compiled;
}

/** Split a textarea/comma separated list into individual patterns. */
export function parsePatternList(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Last matching pattern wins, so `node_modules` + `!node_modules/.bin` works. */
export function isIgnored(node: TreeNode, patterns: readonly CompiledPattern[]): boolean {
  let ignored = false;

  for (const pattern of patterns) {
    if (pattern.directoryOnly && node.type !== 'dir') continue;
    const subject = pattern.matchPath ? node.path : node.name;
    if (pattern.regex.test(subject)) ignored = !pattern.negated;
  }

  return ignored;
}

export interface FilterOptions {
  /** Levels of nesting to keep, 1-based. `null` means unlimited. */
  maxDepth?: number | null;
  includeFiles?: boolean;
  patterns?: readonly string[];
  /** Drop directories that end up with no visible children. */
  pruneEmptyDirectories?: boolean;
}

/**
 * Apply depth, type and ignore-pattern filters, returning a new tree.
 *
 * Directories are always kept when they survive the ignore list, even with
 * `includeFiles: false`, because the folder skeleton is the point of the tool.
 */
export function filterTree(nodes: readonly TreeNode[], options: FilterOptions = {}): TreeNode[] {
  const {
    maxDepth = null,
    includeFiles = true,
    patterns = [],
    pruneEmptyDirectories = false,
  } = options;

  const compiled = compilePatterns(patterns);

  const walk = (input: readonly TreeNode[], depth: number): TreeNode[] => {
    const result: TreeNode[] = [];

    for (const node of input) {
      if (isIgnored(node, compiled)) continue;

      if (node.type !== 'dir') {
        if (!includeFiles) continue;
        result.push(node);
        continue;
      }

      const atDepthLimit = maxDepth !== null && depth >= maxDepth;
      const children = atDepthLimit ? [] : walk(node.children ?? [], depth + 1);

      if (pruneEmptyDirectories && children.length === 0 && !atDepthLimit) continue;

      result.push({ ...node, children });
    }

    return result;
  };

  return walk(nodes, 1);
}
