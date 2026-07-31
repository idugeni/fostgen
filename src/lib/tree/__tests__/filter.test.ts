import { compilePatterns, filterTree, isIgnored, parsePatternList } from '@/lib/tree/filter';
import { type TreeNode } from '@/lib/tree/types';

function dir(name: string, path: string, children: TreeNode[]): TreeNode {
  return { name, path, type: 'dir', children };
}

function file(name: string, path: string, size = 10): TreeNode {
  return { name, path, type: 'file', size };
}

const tree: TreeNode[] = [
  dir('node_modules', 'node_modules', [file('index.js', 'node_modules/index.js')]),
  dir('src', 'src', [
    file('index.ts', 'src/index.ts'),
    file('index.test.ts', 'src/index.test.ts'),
    dir('lib', 'src/lib', [
      file('util.ts', 'src/lib/util.ts'),
      dir('deep', 'src/lib/deep', [file('leaf.ts', 'src/lib/deep/leaf.ts')]),
    ]),
  ]),
  file('README.md', 'README.md'),
];

const names = (nodes: TreeNode[]): string[] => nodes.map((node) => node.name);

describe('parsePatternList', () => {
  it('splits on newlines and commas and drops blanks', () => {
    expect(parsePatternList(' *.log,\n dist/ ,,\n\n docs/** ')).toEqual([
      '*.log',
      'dist/',
      'docs/**',
    ]);
  });
});

describe('compilePatterns', () => {
  it('skips blanks and comments', () => {
    expect(compilePatterns(['', '   ', '# a comment', 'dist'])).toHaveLength(1);
  });

  it('records directory-only, negation and path matching flags', () => {
    const [dirOnly, negated, pathScoped] = compilePatterns(['build/', '!keep', 'src/**']);

    expect(dirOnly).toMatchObject({ directoryOnly: true, negated: false, matchPath: false });
    expect(negated).toMatchObject({ negated: true });
    expect(pathScoped).toMatchObject({ matchPath: true });
  });
});

describe('isIgnored', () => {
  const node = file('util.ts', 'src/lib/util.ts');

  it('matches base names when the pattern has no slash', () => {
    expect(isIgnored(node, compilePatterns(['util.ts']))).toBe(true);
    expect(isIgnored(node, compilePatterns(['*.ts']))).toBe(true);
    expect(isIgnored(node, compilePatterns(['*.js']))).toBe(false);
  });

  it('matches full paths when the pattern has a slash', () => {
    expect(isIgnored(node, compilePatterns(['src/lib/util.ts']))).toBe(true);
    expect(isIgnored(node, compilePatterns(['src/*']))).toBe(false);
    expect(isIgnored(node, compilePatterns(['src/**']))).toBe(true);
  });

  it('lets a later negation win', () => {
    expect(isIgnored(node, compilePatterns(['*.ts', '!util.ts']))).toBe(false);
    expect(isIgnored(node, compilePatterns(['!util.ts', '*.ts']))).toBe(true);
  });

  it('applies directory-only patterns to directories only', () => {
    const patterns = compilePatterns(['lib/']);
    expect(isIgnored(dir('lib', 'src/lib', []), patterns)).toBe(true);
    expect(isIgnored(file('lib', 'src/lib'), patterns)).toBe(false);
  });

  it('treats **/ as optional so it matches at the root too', () => {
    const patterns = compilePatterns(['**/util.ts']);
    expect(isIgnored(node, patterns)).toBe(true);
    expect(isIgnored(file('util.ts', 'util.ts'), patterns)).toBe(true);
  });

  it('supports ? as a single non-separator character', () => {
    expect(isIgnored(file('a.ts', 'a.ts'), compilePatterns(['?.ts']))).toBe(true);
    expect(isIgnored(file('ab.ts', 'ab.ts'), compilePatterns(['?.ts']))).toBe(false);
  });

  it('escapes regex metacharacters in literal patterns', () => {
    expect(isIgnored(file('a+b.ts', 'a+b.ts'), compilePatterns(['a+b.ts']))).toBe(true);
    expect(isIgnored(file('aab.ts', 'aab.ts'), compilePatterns(['a+b.ts']))).toBe(false);
  });
});

describe('filterTree', () => {
  it('returns everything by default', () => {
    expect(names(filterTree(tree))).toEqual(['node_modules', 'src', 'README.md']);
  });

  it('drops ignored subtrees entirely', () => {
    const result = filterTree(tree, { patterns: ['node_modules'] });
    expect(names(result)).toEqual(['src', 'README.md']);
  });

  it('limits depth without dropping the directory itself', () => {
    const result = filterTree(tree, { maxDepth: 2 });
    const src = result.find((node) => node.name === 'src');

    expect(names(src?.children ?? [])).toEqual(['index.ts', 'index.test.ts', 'lib']);
    expect(src?.children?.find((node) => node.name === 'lib')?.children).toEqual([]);
  });

  it('keeps only directories when includeFiles is false', () => {
    const result = filterTree(tree, { includeFiles: false });

    expect(names(result)).toEqual(['node_modules', 'src']);
    expect(names(result.find((node) => node.name === 'src')?.children ?? [])).toEqual(['lib']);
  });

  it('prunes directories whose only children were ignored', () => {
    const result = filterTree(tree, {
      patterns: ['index.js'],
      pruneEmptyDirectories: true,
    });

    // `node_modules` held nothing but the ignored file, so it disappears too.
    expect(names(result)).toEqual(['src', 'README.md']);
  });

  it('combines patterns and negation', () => {
    const result = filterTree(tree, { patterns: ['*.ts', '!index.ts'] });
    const src = result.find((node) => node.name === 'src');

    expect(names(src?.children ?? [])).toEqual(['index.ts', 'lib']);
  });

  it('does not mutate the input tree', () => {
    const snapshot = JSON.stringify(tree);
    filterTree(tree, { maxDepth: 1, patterns: ['src'] });
    expect(JSON.stringify(tree)).toBe(snapshot);
  });
});
