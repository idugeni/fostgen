import { formatBytes } from '@/lib/format/units';
import { type TreeNode } from '@/lib/tree/types';

export const OUTPUT_FORMATS = ['ascii', 'markdown', 'json', 'yaml', 'paths'] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

interface FormatMeta {
  label: string;
  description: string;
  /** Info string used when wrapping in a Markdown code fence. */
  language: string;
  extension: string;
  /** Whether wrapping the payload in a fence still produces a valid file. */
  supportsFence: boolean;
}

export const OUTPUT_FORMAT_META: Record<OutputFormat, FormatMeta> = {
  ascii: {
    label: 'ASCII tree',
    description: 'Box-drawing tree, ideal for READMEs',
    language: 'bash',
    extension: 'md',
    supportsFence: true,
  },
  markdown: {
    label: 'Markdown list',
    description: 'Nested bullet list with a heading',
    language: 'markdown',
    extension: 'md',
    supportsFence: false,
  },
  json: {
    label: 'JSON',
    description: 'Machine-readable nested objects',
    language: 'json',
    extension: 'json',
    supportsFence: false,
  },
  yaml: {
    label: 'YAML',
    description: 'Nested mapping, easy to diff',
    language: 'yaml',
    extension: 'yaml',
    supportsFence: false,
  },
  paths: {
    label: 'Flat paths',
    description: 'One path per line, pipe-friendly',
    language: 'text',
    extension: 'txt',
    supportsFence: true,
  },
};

export interface RenderOptions {
  /** Label for the synthetic root, usually the repository name. */
  rootName: string;
  format: OutputFormat;
  showSizes?: boolean;
  /** Append `/` to directory names. */
  trailingSlash?: boolean;
  /** Wrap the payload in a Markdown code fence (formats that support it). */
  fenced?: boolean;
}

const BRANCH = '├─ ';
const LAST_BRANCH = '└─ ';
const VERTICAL = '│  ';
const BLANK = '   ';

function displayName(node: TreeNode, trailingSlash: boolean): string {
  if (node.type === 'dir' && trailingSlash) return `${node.name}/`;
  return node.name;
}

function sizeSuffix(node: TreeNode, showSizes: boolean): string {
  if (!showSizes || node.size === undefined || node.size <= 0) return '';
  return ` (${formatBytes(node.size)})`;
}

function renderAscii(nodes: readonly TreeNode[], options: Required<Omit<RenderOptions, 'fenced'>>): string {
  const lines: string[] = [
    options.trailingSlash ? `${options.rootName}/` : options.rootName,
  ];

  const walk = (input: readonly TreeNode[], prefix: string): void => {
    input.forEach((node, index) => {
      const isLast = index === input.length - 1;
      lines.push(
        `${prefix}${isLast ? LAST_BRANCH : BRANCH}${displayName(node, options.trailingSlash)}${sizeSuffix(node, options.showSizes)}`,
      );
      if (node.children && node.children.length > 0) {
        walk(node.children, `${prefix}${isLast ? BLANK : VERTICAL}`);
      }
    });
  };

  walk(nodes, '');
  return lines.join('\n');
}

function renderMarkdownList(
  nodes: readonly TreeNode[],
  options: Required<Omit<RenderOptions, 'fenced'>>,
): string {
  const lines: string[] = [`# ${options.rootName}`, ''];

  const walk = (input: readonly TreeNode[], depth: number): void => {
    for (const node of input) {
      const indent = '  '.repeat(depth);
      const label = displayName(node, options.trailingSlash);
      const name = node.type === 'dir' ? `**\`${label}\`**` : `\`${label}\``;
      lines.push(`${indent}- ${name}${sizeSuffix(node, options.showSizes)}`);
      if (node.children && node.children.length > 0) walk(node.children, depth + 1);
    }
  };

  walk(nodes, 0);
  return lines.join('\n');
}

function renderPaths(
  nodes: readonly TreeNode[],
  options: Required<Omit<RenderOptions, 'fenced'>>,
): string {
  const lines: string[] = [];

  const walk = (input: readonly TreeNode[]): void => {
    for (const node of input) {
      const suffix = node.type === 'dir' && options.trailingSlash ? '/' : '';
      lines.push(`${node.path}${suffix}${sizeSuffix(node, options.showSizes)}`);
      if (node.children) walk(node.children);
    }
  };

  walk(nodes);
  return lines.join('\n');
}

interface SerialisableNode {
  name: string;
  path: string;
  type: TreeNode['type'];
  size?: number;
  children?: SerialisableNode[];
}

function toSerialisable(node: TreeNode, showSizes: boolean): SerialisableNode {
  return {
    name: node.name,
    path: node.path,
    type: node.type,
    ...(showSizes && node.size !== undefined ? { size: node.size } : {}),
    ...(node.children ? { children: node.children.map((child) => toSerialisable(child, showSizes)) } : {}),
  };
}

function renderJson(
  nodes: readonly TreeNode[],
  options: Required<Omit<RenderOptions, 'fenced'>>,
): string {
  return `${JSON.stringify(
    {
      name: options.rootName,
      type: 'dir',
      children: nodes.map((node) => toSerialisable(node, options.showSizes)),
    },
    null,
    2,
  )}\n`;
}

const PLAIN_YAML_SCALAR = /^[A-Za-z0-9][A-Za-z0-9 _.@+-]*$/;
const YAML_RESERVED = new Set([
  'y', 'n', 'yes', 'no', 'true', 'false', 'on', 'off', 'null', '~',
]);

/** Quote a YAML scalar only when necessary, escaping single quotes by doubling. */
export function yamlScalar(value: string): string {
  if (!PLAIN_YAML_SCALAR.test(value) || YAML_RESERVED.has(value.toLowerCase())) {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

function renderYaml(
  nodes: readonly TreeNode[],
  options: Required<Omit<RenderOptions, 'fenced'>>,
): string {
  const lines: string[] = [`name: ${yamlScalar(options.rootName)}`, 'type: dir'];

  const walk = (input: readonly TreeNode[], indent: string): void => {
    for (const node of input) {
      lines.push(`${indent}- name: ${yamlScalar(node.name)}`);
      lines.push(`${indent}  type: ${node.type}`);
      if (options.showSizes && node.size !== undefined) {
        lines.push(`${indent}  size: ${node.size}`);
      }
      if (node.children && node.children.length > 0) {
        lines.push(`${indent}  children:`);
        walk(node.children, `${indent}    `);
      }
    }
  };

  if (nodes.length === 0) {
    lines.push('children: []');
  } else {
    lines.push('children:');
    walk(nodes, '  ');
  }

  return `${lines.join('\n')}\n`;
}

/** Render a tree into the requested textual format. */
export function renderTree(nodes: readonly TreeNode[], options: RenderOptions): string {
  const resolved = {
    rootName: options.rootName || 'repository',
    format: options.format,
    showSizes: options.showSizes ?? false,
    trailingSlash: options.trailingSlash ?? true,
  } satisfies Required<Omit<RenderOptions, 'fenced'>>;

  const meta = OUTPUT_FORMAT_META[resolved.format];

  const body = (() => {
    switch (resolved.format) {
      case 'markdown':
        return renderMarkdownList(nodes, resolved);
      case 'json':
        return renderJson(nodes, resolved);
      case 'yaml':
        return renderYaml(nodes, resolved);
      case 'paths':
        return renderPaths(nodes, resolved);
      case 'ascii':
      default:
        return renderAscii(nodes, resolved);
    }
  })();

  if (options.fenced && meta.supportsFence) {
    return `\`\`\`${meta.language}\n${body}\n\`\`\``;
  }

  return body;
}

/** Suggested download file name, e.g. `fostgen-structure.md`. */
export function downloadFileName(rootName: string, format: OutputFormat): string {
  const safe = (rootName || 'repository')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return `${safe || 'repository'}-structure.${OUTPUT_FORMAT_META[format].extension}`;
}
