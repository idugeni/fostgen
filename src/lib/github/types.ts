/** Entry types returned by the Git trees API. `commit` means "submodule". */
export type GitTreeEntryType = 'blob' | 'tree' | 'commit';

export interface GitTreeEntry {
  path: string;
  type: GitTreeEntryType;
  /** Present for blobs only. */
  size?: number;
  sha?: string;
  mode?: string;
}

export interface RepositoryMeta {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  htmlUrl: string;
  homepage: string | null;
  language: string | null;
  license: string | null;
  topics: string[];
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  /** Repository size as reported by GitHub, in kilobytes. */
  sizeKb: number;
  isFork: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  pushedAt: string | null;
  updatedAt: string | null;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  /** Unix epoch seconds at which the window resets. */
  reset: number;
  /** True when the request was made with a `GITHUB_TOKEN`. */
  authenticated: boolean;
}

/** A repository coordinate parsed out of arbitrary user input. */
export interface RepoCoordinates {
  owner: string;
  repo: string;
  /** Branch, tag or commit-ish, when the input carried one. */
  ref?: string;
  /** Sub-directory inside the repository, without leading/trailing slashes. */
  path?: string;
}
