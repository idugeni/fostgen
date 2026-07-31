export type TreeNodeType = 'dir' | 'file' | 'submodule';

/** A node in the hierarchical structure rendered by the app. */
export interface TreeNode {
  name: string;
  /** Path relative to the rendered root, without a leading slash. */
  path: string;
  type: TreeNodeType;
  /** Byte size, present for files when GitHub reported one. */
  size?: number;
  /** Present on directories only; may be an empty array. */
  children?: TreeNode[];
}

export function isDirectory(node: TreeNode): boolean {
  return node.type === 'dir';
}
