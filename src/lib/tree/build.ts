import { type GitTreeEntry } from '@/lib/github/types';
import { type TreeNode } from '@/lib/tree/types';

interface MutableNode {
  name: string;
  path: string;
  type: 'dir' | 'file' | 'submodule';
  size?: number;
  children: MutableNode[];
}

function splitPath(path: string): { parent: string; name: string } {
  const index = path.lastIndexOf('/');
  return index === -1
    ? { parent: '', name: path }
    : { parent: path.slice(0, index), name: path.slice(index + 1) };
}

function normalisePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

function finalise(node: MutableNode): TreeNode {
  const base: TreeNode = {
    name: node.name,
    path: node.path,
    type: node.type,
    ...(node.size === undefined ? {} : { size: node.size }),
  };

  return node.type === 'dir' ? { ...base, children: node.children.map(finalise) } : base;
}

/**
 * Convert GitHub's flat, recursive tree listing into a nested structure.
 *
 * Two details the previous implementation got wrong are handled here:
 * - Directories are identified by GitHub's `type` field rather than inferred
 *   from "has children", so **empty directories stay directories**.
 * - Parent nodes are synthesised on demand, so the entry order in the API
 *   response does not matter.
 *
 * Submodules (`type: 'commit'`) are kept as a distinct leaf type.
 */
export function buildTree(entries: readonly GitTreeEntry[]): TreeNode[] {
  const root: MutableNode = { name: '', path: '', type: 'dir', children: [] };
  const directories = new Map<string, MutableNode>([['', root]]);
  const seen = new Set<string>();

  const ensureDirectory = (path: string): MutableNode => {
    const existing = directories.get(path);
    if (existing) return existing;

    const { parent, name } = splitPath(path);
    const node: MutableNode = { name, path, type: 'dir', children: [] };
    ensureDirectory(parent).children.push(node);
    directories.set(path, node);
    seen.add(path);
    return node;
  };

  for (const entry of entries) {
    const path = normalisePath(entry.path);
    if (!path) continue;

    if (entry.type === 'tree') {
      ensureDirectory(path);
      continue;
    }

    if (seen.has(path)) continue;
    seen.add(path);

    const { parent, name } = splitPath(path);
    ensureDirectory(parent).children.push({
      name,
      path,
      type: entry.type === 'commit' ? 'submodule' : 'file',
      ...(typeof entry.size === 'number' ? { size: entry.size } : {}),
      children: [],
    });
  }

  return root.children.map(finalise);
}

/** Total number of nodes in a tree, useful for cheap guard rails. */
export function countNodes(nodes: readonly TreeNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + (node.children ? countNodes(node.children) : 0),
    0,
  );
}


/**
 * Return a copy of the tree where every directory carries the summed byte size
 * of its descendants, so "show sizes" is meaningful for folders too.
 */
export function withAggregatedSizes(nodes: readonly TreeNode[]): TreeNode[] {
  return nodes.map((node) => {
    if (!node.children) return node;

    const children = withAggregatedSizes(node.children);
    const total = children.reduce((sum, child) => sum + (child.size ?? 0), 0);

    return { ...node, children, size: total };
  });
}
