import { type TreeNode } from '@/lib/tree/types';

export const SORT_MODES = ['dirs-first', 'alpha', 'size-desc'] as const;

export type SortMode = (typeof SORT_MODES)[number];

export const SORT_MODE_LABELS: Record<SortMode, string> = {
  'dirs-first': 'Folders first',
  alpha: 'Alphabetical',
  'size-desc': 'Largest first',
};

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function compare(a: TreeNode, b: TreeNode, mode: SortMode): number {
  if (mode === 'dirs-first') {
    const aIsDir = a.type === 'dir';
    const bIsDir = b.type === 'dir';
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return collator.compare(a.name, b.name);
  }

  if (mode === 'size-desc') {
    const delta = (b.size ?? 0) - (a.size ?? 0);
    if (delta !== 0) return delta;
    return collator.compare(a.name, b.name);
  }

  return collator.compare(a.name, b.name);
}

/** Recursively sort a tree, returning a new array (input is untouched). */
export function sortTree(nodes: readonly TreeNode[], mode: SortMode): TreeNode[] {
  return [...nodes]
    .sort((a, b) => compare(a, b, mode))
    .map((node) => (node.children ? { ...node, children: sortTree(node.children, mode) } : node));
}
