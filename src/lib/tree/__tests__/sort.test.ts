import { sortTree } from '@/lib/tree/sort';
import { computeStats } from '@/lib/tree/stats';
import { type TreeNode } from '@/lib/tree/types';

const tree: TreeNode[] = [
  { name: 'zeta.ts', path: 'zeta.ts', type: 'file', size: 30 },
  {
    name: 'beta',
    path: 'beta',
    type: 'dir',
    children: [
      { name: 'b.ts', path: 'beta/b.ts', type: 'file', size: 5 },
      { name: 'a.ts', path: 'beta/a.ts', type: 'file', size: 50 },
    ],
  },
  { name: 'Alpha.ts', path: 'Alpha.ts', type: 'file', size: 100 },
  { name: 'theme', path: 'theme', type: 'submodule' },
];

const names = (nodes: TreeNode[]): string[] => nodes.map((node) => node.name);

describe('sortTree', () => {
  it('puts directories first, then case-insensitive names', () => {
    expect(names(sortTree(tree, 'dirs-first'))).toEqual([
      'beta',
      'Alpha.ts',
      'theme',
      'zeta.ts',
    ]);
  });

  it('sorts purely alphabetically when asked', () => {
    expect(names(sortTree(tree, 'alpha'))).toEqual(['Alpha.ts', 'beta', 'theme', 'zeta.ts']);
  });

  it('sorts by size descending', () => {
    expect(names(sortTree(tree, 'size-desc'))).toEqual([
      'Alpha.ts',
      'zeta.ts',
      'beta',
      'theme',
    ]);
  });

  it('sorts nested children too', () => {
    const beta = sortTree(tree, 'alpha').find((node) => node.name === 'beta');
    expect(names(beta?.children ?? [])).toEqual(['a.ts', 'b.ts']);
  });

  it('does not mutate the input', () => {
    const snapshot = JSON.stringify(tree);
    sortTree(tree, 'size-desc');
    expect(JSON.stringify(tree)).toBe(snapshot);
  });
});

describe('computeStats', () => {
  it('counts directories, files, submodules, depth and size', () => {
    expect(computeStats(tree)).toEqual({
      directories: 1,
      files: 4,
      submodules: 1,
      totalSize: 185,
      maxDepth: 2,
    });
  });

  it('returns zeroes for an empty tree', () => {
    expect(computeStats([])).toEqual({
      directories: 0,
      files: 0,
      submodules: 0,
      totalSize: 0,
      maxDepth: 0,
    });
  });
});
