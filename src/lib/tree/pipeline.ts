import { DEFAULT_IGNORE_PATTERNS, type GeneratorOptions } from '@/lib/config';
import { withAggregatedSizes } from '@/lib/tree/build';
import { filterTree } from '@/lib/tree/filter';
import { renderTree } from '@/lib/tree/render';
import { sortTree } from '@/lib/tree/sort';
import { computeStats, type TreeStats } from '@/lib/tree/stats';
import { type TreeNode } from '@/lib/tree/types';

export interface DerivedStructure {
  /** The tree after filtering and sorting — what the user actually sees. */
  nodes: TreeNode[];
  /** Serialised output in the requested format. */
  output: string;
  stats: TreeStats;
}

/** Resolve the effective ignore list from the toggle plus user patterns. */
export function resolveIgnorePatterns(options: GeneratorOptions): string[] {
  return [
    ...(options.applyDefaultIgnores ? DEFAULT_IGNORE_PATTERNS : []),
    ...options.ignorePatterns,
  ];
}

/**
 * The single place where raw tree data becomes user-visible output.
 *
 * Keeping filter -> aggregate -> sort -> render in one pure function means the
 * UI can recompute instantly when an option changes, with no refetch, and the
 * tests can assert the exact same pipeline the browser runs.
 */
export function deriveStructure(
  nodes: readonly TreeNode[],
  options: GeneratorOptions,
  rootName: string,
): DerivedStructure {
  const filtered = filterTree(nodes, {
    maxDepth: options.maxDepth,
    includeFiles: options.includeFiles,
    patterns: resolveIgnorePatterns(options),
  });

  const sized = options.showSizes ? withAggregatedSizes(filtered) : filtered;
  const sorted = sortTree(sized, options.sort);

  return {
    nodes: sorted,
    stats: computeStats(sorted),
    output: renderTree(sorted, {
      rootName,
      format: options.format,
      showSizes: options.showSizes,
      trailingSlash: options.trailingSlash,
      fenced: options.fenced,
    }),
  };
}
