import { type GitTreeEntry } from '@/lib/github/types';
import { buildTree, countNodes, withAggregatedSizes } from '@/lib/tree/build';
import { sortTree } from '@/lib/tree/sort';

const entries: GitTreeEntry[] = [
  { path: 'README.md', type: 'blob', size: 120 },
  { path: 'src', type: 'tree' },
  { path: 'src/index.ts', type: 'blob', size: 800 },
  { path: 'src/lib', type: 'tree' },
  { path: 'src/lib/util.ts', type: 'blob', size: 200 },
  { path: 'docs', type: 'tree' },
  { path: 'vendor/theme', type: 'commit' },
];

describe('buildTree', () => {
  it('nests entries under synthesised parents', () => {
    const tree = buildTree(entries);
    const src = tree.find((node) => node.name === 'src');

    expect(src?.type).toBe('dir');
    expect(src?.children?.map((child) => child.name).sort()).toEqual(['index.ts', 'lib']);
    expect(src?.children?.find((child) => child.name === 'lib')?.children).toHaveLength(1);
  });

  it('keeps empty directories as directories', () => {
    const docs = buildTree(entries).find((node) => node.name === 'docs');

    expect(docs).toMatchObject({ type: 'dir', path: 'docs' });
    expect(docs?.children).toEqual([]);
  });

  it('marks submodules distinctly and synthesises their parent', () => {
    const vendor = buildTree(entries).find((node) => node.name === 'vendor');

    expect(vendor?.type).toBe('dir');
    expect(vendor?.children?.[0]).toMatchObject({ name: 'theme', type: 'submodule' });
  });

  it('produces the same shape regardless of entry order', () => {
    // buildTree preserves discovery order by design; sorting is a separate stage,
    // so the comparison is made after sorting.
    const shuffled = [...entries].reverse();
    expect(sortTree(buildTree(shuffled), 'dirs-first')).toEqual(
      sortTree(buildTree(entries), 'dirs-first'),
    );
  });

  it('ignores empty and duplicated paths', () => {
    const tree = buildTree([
      { path: '', type: 'blob' },
      { path: '/', type: 'blob' },
      { path: 'a.ts', type: 'blob' },
      { path: 'a.ts', type: 'blob' },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe('a.ts');
  });

  it('records file sizes and omits them for directories', () => {
    const tree = buildTree(entries);
    expect(tree.find((node) => node.name === 'README.md')?.size).toBe(120);
    expect(tree.find((node) => node.name === 'src')?.size).toBeUndefined();
  });
});

describe('countNodes', () => {
  it('counts every node in the tree', () => {
    // README.md, src, src/index.ts, src/lib, src/lib/util.ts, docs, vendor, vendor/theme
    expect(countNodes(buildTree(entries))).toBe(8);
  });
});

describe('withAggregatedSizes', () => {
  it('sums descendant sizes onto directories', () => {
    const tree = withAggregatedSizes(buildTree(entries));
    const src = tree.find((node) => node.name === 'src');

    expect(src?.size).toBe(1000);
    expect(src?.children?.find((child) => child.name === 'lib')?.size).toBe(200);
    expect(tree.find((node) => node.name === 'docs')?.size).toBe(0);
  });

  it('leaves files untouched', () => {
    const tree = withAggregatedSizes(buildTree(entries));
    expect(tree.find((node) => node.name === 'README.md')?.size).toBe(120);
  });
});
