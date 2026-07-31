import {
  OUTPUT_FORMAT_META,
  downloadFileName,
  renderTree,
  yamlScalar,
} from '@/lib/tree/render';
import { type TreeNode } from '@/lib/tree/types';

const tree: TreeNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'dir',
    children: [
      { name: 'index.ts', path: 'src/index.ts', type: 'file', size: 1024 },
      { name: 'empty', path: 'src/empty', type: 'dir', children: [] },
    ],
  },
  { name: 'README.md', path: 'README.md', type: 'file', size: 512 },
];

describe('renderTree / ascii', () => {
  it('draws the tree with box connectors', () => {
    expect(renderTree(tree, { rootName: 'demo', format: 'ascii' })).toBe(
      [
        'demo/',
        '├─ src/',
        '│  ├─ index.ts',
        '│  └─ empty/',
        '└─ README.md',
      ].join('\n'),
    );
  });

  it('can omit trailing slashes', () => {
    const output = renderTree(tree, {
      rootName: 'demo',
      format: 'ascii',
      trailingSlash: false,
    });

    expect(output.split('\n')[0]).toBe('demo');
    expect(output).toContain('├─ src\n');
  });

  it('appends human-readable sizes when asked', () => {
    const output = renderTree(tree, { rootName: 'demo', format: 'ascii', showSizes: true });

    expect(output).toContain('index.ts (1 KB)');
    expect(output).toContain('README.md (512 B)');
  });

  it('wraps in a code fence when requested', () => {
    const output = renderTree(tree, { rootName: 'demo', format: 'ascii', fenced: true });

    expect(output.startsWith('```bash\n')).toBe(true);
    expect(output.endsWith('\n```')).toBe(true);
  });

  it('falls back to a generic root name', () => {
    expect(renderTree([], { rootName: '', format: 'ascii' })).toBe('repository/');
  });
});

describe('renderTree / markdown', () => {
  it('emits a heading and a nested bullet list', () => {
    expect(renderTree(tree, { rootName: 'demo', format: 'markdown' })).toBe(
      [
        '# demo',
        '',
        '- **`src/`**',
        '  - `index.ts`',
        '  - **`empty/`**',
        '- `README.md`',
      ].join('\n'),
    );
  });

  it('is never fenced, even when the option is on', () => {
    const output = renderTree(tree, { rootName: 'demo', format: 'markdown', fenced: true });
    expect(output.startsWith('```')).toBe(false);
  });
});

describe('renderTree / paths', () => {
  it('lists one path per line', () => {
    expect(renderTree(tree, { rootName: 'demo', format: 'paths' })).toBe(
      ['src/', 'src/index.ts', 'src/empty/', 'README.md'].join('\n'),
    );
  });
});

describe('renderTree / json', () => {
  it('produces parsable JSON rooted at the repository', () => {
    const parsed: unknown = JSON.parse(
      renderTree(tree, { rootName: 'demo', format: 'json', showSizes: true }),
    );

    expect(parsed).toMatchObject({
      name: 'demo',
      type: 'dir',
      children: [
        {
          name: 'src',
          type: 'dir',
          children: [
            { name: 'index.ts', type: 'file', size: 1024 },
            { name: 'empty', type: 'dir', children: [] },
          ],
        },
        { name: 'README.md', type: 'file', size: 512 },
      ],
    });
  });

  it('omits sizes when the option is off', () => {
    expect(renderTree(tree, { rootName: 'demo', format: 'json' })).not.toContain('"size"');
  });
});

describe('renderTree / yaml', () => {
  it('nests children under indented sequences', () => {
    expect(renderTree(tree, { rootName: 'demo', format: 'yaml' })).toBe(
      [
        'name: demo',
        'type: dir',
        'children:',
        '  - name: src',
        '    type: dir',
        '    children:',
        '      - name: index.ts',
        '        type: file',
        '      - name: empty',
        '        type: dir',
        '  - name: README.md',
        '    type: file',
        '',
      ].join('\n'),
    );
  });

  it('handles an empty tree', () => {
    expect(renderTree([], { rootName: 'demo', format: 'yaml' })).toContain('children: []');
  });
});

describe('yamlScalar', () => {
  it.each([
    ['plain.ts', 'plain.ts'],
    ['with space', 'with space'],
    ['no', "'no'"],
    ['true', "'true'"],
    ['*glob*', "'*glob*'"],
    ["it's", "'it''s'"],
    ['-leading', "'-leading'"],
  ])('quotes %s only when required', (input, expected) => {
    expect(yamlScalar(input)).toBe(expected);
  });
});

describe('downloadFileName', () => {
  it('uses the format extension', () => {
    expect(downloadFileName('my-repo', 'ascii')).toBe('my-repo-structure.md');
    expect(downloadFileName('my-repo', 'json')).toBe('my-repo-structure.json');
    expect(downloadFileName('my-repo', 'yaml')).toBe('my-repo-structure.yaml');
    expect(downloadFileName('my-repo', 'paths')).toBe('my-repo-structure.txt');
  });

  it('sanitises unsafe characters', () => {
    expect(downloadFileName('../weird name/', 'ascii')).toBe('weird-name-structure.md');
    expect(downloadFileName('', 'ascii')).toBe('repository-structure.md');
  });
});

describe('OUTPUT_FORMAT_META', () => {
  it('marks only text formats as fenceable', () => {
    expect(OUTPUT_FORMAT_META.ascii.supportsFence).toBe(true);
    expect(OUTPUT_FORMAT_META.paths.supportsFence).toBe(true);
    expect(OUTPUT_FORMAT_META.json.supportsFence).toBe(false);
    expect(OUTPUT_FORMAT_META.yaml.supportsFence).toBe(false);
    expect(OUTPUT_FORMAT_META.markdown.supportsFence).toBe(false);
  });
});
