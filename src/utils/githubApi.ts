export interface TreeItem {
    path: string;
    type?: 'blob' | 'tree'; // Menandakan apakah item adalah file atau direktori
  }
  
  // Tipe untuk struktur pohon (treeDict)
  interface TreeDict {
    [key: string]: TreeDict | null;
  }
  
  export const extractOwnerRepo = (url: string): { owner: string; repo: string } => {
    try {
      const cleanUrl = url.trim().replace(/\/$/, '');
      const urlObj = new URL(cleanUrl);
      const parts = urlObj.pathname.split('/').filter(Boolean);
  
      if (parts.length < 2) {
        throw new Error('Invalid repository URL format');
      }
  
      return {
        owner: parts[0],
        repo: parts[1],
      };
    } catch {
      throw new Error('Please enter a valid GitHub repository URL');
    }
  };
  
  export const getDefaultBranch = async (owner: string, repo: string): Promise<string> => {
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          throw new Error('Repository not found. Please check the URL.');
        }
        if (repoRes.status === 403) {
          throw new Error('API rate limit exceeded. Please try again later.');
        }
        throw new Error('Failed to access repository');
      }
      const repoData = await repoRes.json();
      return repoData.default_branch || 'main';
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new Error(err.message || 'Failed to fetch repository information');
      }
      throw new Error('Failed to fetch repository information');
    }
  };
  
  export const getTree = async (
    owner: string,
    repo: string,
    branch: string
  ): Promise<TreeItem[]> => {
    try {
      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`
      );
      if (!commitRes.ok) {
        throw new Error('Cannot access repository commits');
      }
      const commitData = await commitRes.json();
      if (!commitData.commit || !commitData.commit.tree) {
        throw new Error('Invalid commit data received');
      }
      const treeSha = commitData.commit.tree.sha;
  
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`
      );
      if (!treeRes.ok) {
        throw new Error('Cannot fetch folder structure');
      }
      const treeData = await treeRes.json();
  
      if (treeData.truncated) {
        throw new Error('Repository is too large to display complete structure');
      }
  
      if (!Array.isArray(treeData.tree)) {
        throw new Error('Unexpected folder structure format');
      }
  
      return treeData.tree;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new Error(err.message || 'Failed to fetch folder structure');
      }
      throw new Error('Failed to fetch folder structure');
    }
  };
  
  export const buildMarkdownTree = (tree: TreeItem[]): string => {
    if (!Array.isArray(tree)) return '';
  
    const treeDict: TreeDict = {};
    tree.forEach((item: TreeItem) => {
      const parts = item.path.split('/');
      let current: TreeDict = treeDict;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? null : {};
        }
        if (current[part] !== null) {
          current = current[part] as TreeDict;
        }
      });
    });
  
    const formatTree = (node: TreeDict, prefix: string = ''): string => {
      const keys = Object.keys(node).sort((a, b) => {
        const aIsDir = node[a] !== null;
        const bIsDir = node[b] !== null;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });
  
      return keys
        .map((key, index) => {
          const isLast = index === keys.length - 1;
          const connector = isLast ? '└─ ' : '├─ ';
          const line = `${prefix}${connector}${key}\n`;
          const child = node[key];
          const newPrefix = prefix + (isLast ? '   ' : '│  ');
          if (child && typeof child === 'object') {
            return line + formatTree(child, newPrefix);
          } else {
            return line;
          }
        })
        .join('');
    };
  
    return formatTree(treeDict);
  };
  