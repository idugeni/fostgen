import { type TreeNode } from '@/lib/tree/types';

export interface TreeStats {
  directories: number;
  files: number;
  submodules: number;
  /** Sum of file sizes in bytes; `0` when GitHub reported none. */
  totalSize: number;
  /** Deepest nesting level, 1-based. `0` for an empty tree. */
  maxDepth: number;
}

const EMPTY: TreeStats = {
  directories: 0,
  files: 0,
  submodules: 0,
  totalSize: 0,
  maxDepth: 0,
};

/** Aggregate counts for a rendered tree. Directory sizes are never double-counted. */
export function computeStats(nodes: readonly TreeNode[]): TreeStats {
  const stats: TreeStats = { ...EMPTY };

  const walk = (input: readonly TreeNode[], depth: number): void => {
    if (input.length > 0) stats.maxDepth = Math.max(stats.maxDepth, depth);

    for (const node of input) {
      if (node.type === 'dir') {
        stats.directories += 1;
        walk(node.children ?? [], depth + 1);
        continue;
      }

      if (node.type === 'submodule') {
        stats.submodules += 1;
        continue;
      }

      stats.files += 1;
      stats.totalSize += node.size ?? 0;
    }
  };

  walk(nodes, 1);
  return stats;
}
