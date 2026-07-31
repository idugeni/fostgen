import { DEFAULT_GENERATOR_OPTIONS, type GeneratorOptions } from '@/lib/config';
import { buildTree } from '@/lib/tree/build';
import { deriveStructure, resolveIgnorePatterns } from '@/lib/tree/pipeline';

const nodes = buildTree([
  { path: 'node_modules', type: 'tree' },
  { path: 'node_modules/left-pad/index.js', type: 'blob', size: 40 },
  { path: 'package-lock.json', type: 'blob', size: 900 },
  { path: 'src', type: 'tree' },
  { path: 'src/index.ts', type: 'blob', size: 100 },
  { path: 'src/lib/util.ts', type: 'blob', size: 50 },
  { path: 'README.md', type: 'blob', size: 10 },
]);

function options(overrides: Partial<GeneratorOptions> = {}): GeneratorOptions {
  return { ...DEFAULT_GENERATOR_OPTIONS, ...overrides };
}

describe('resolveIgnorePatterns', () => {
  it('prepends the defaults, then user patterns', () => {
    const patterns = resolveIgnorePatterns(options({ ignorePatterns: ['*.md'] }));

    expect(patterns).toContain('node_modules');
    expect(patterns.at(-1)).toBe('*.md');
  });

  it('returns only user patterns when defaults are off', () => {
    expect(
      resolveIgnorePatterns(options({ applyDefaultIgnores: false, ignorePatterns: ['*.md'] })),
    ).toEqual(['*.md']);
  });
});

describe('deriveStructure', () => {
  it('applies the default ignore list', () => {
    const { output, stats } = deriveStructure(nodes, options({ fenced: false }), 'demo');

    expect(output).not.toContain('node_modules');
    expect(output).not.toContain('package-lock.json');
    expect(stats.directories).toBe(2); // src and src/lib
    expect(stats.files).toBe(3); // index.ts, util.ts, README.md
  });

  it('renders the requested format and honours the fence toggle', () => {
    const fenced = deriveStructure(nodes, options({ fenced: true }), 'demo');
    expect(fenced.output.startsWith('```bash')).toBe(true);

    const json = deriveStructure(nodes, options({ format: 'json' }), 'demo');
    expect(() => JSON.parse(json.output)).not.toThrow();
  });

  it('recomputes stats from the filtered tree only', () => {
    const shallow = deriveStructure(nodes, options({ maxDepth: 1, fenced: false }), 'demo');

    expect(shallow.stats.maxDepth).toBe(1);
    expect(shallow.output.split('\n')).toHaveLength(3); // root + src + README.md
  });

  it('aggregates directory sizes only when sizes are shown', () => {
    const withSizes = deriveStructure(nodes, options({ showSizes: true, fenced: false }), 'demo');
    expect(withSizes.output).toContain('src/ (150 B)');

    const withoutSizes = deriveStructure(nodes, options({ fenced: false }), 'demo');
    expect(withoutSizes.output).not.toContain('(150 B)');
  });

  it('drops files when includeFiles is off', () => {
    const { output } = deriveStructure(
      nodes,
      options({ includeFiles: false, fenced: false }),
      'demo',
    );

    expect(output).toContain('src/');
    expect(output).not.toContain('index.ts');
  });
});
