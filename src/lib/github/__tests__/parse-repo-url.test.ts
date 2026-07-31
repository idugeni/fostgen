import { AppError } from '@/lib/errors';
import {
  formatCoordinates,
  parseRepoUrl,
  repositoryUrl,
} from '@/lib/github/parse-repo-url';
import { type RepoCoordinates } from '@/lib/github/types';

describe('parseRepoUrl', () => {
  const cases: Array<[string, RepoCoordinates]> = [
    ['owner/repo', { owner: 'owner', repo: 'repo' }],
    ['  owner/repo  ', { owner: 'owner', repo: 'repo' }],
    ['github.com/owner/repo', { owner: 'owner', repo: 'repo' }],
    ['www.github.com/owner/repo', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo/', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo.git', { owner: 'owner', repo: 'repo' }],
    ['git+https://github.com/owner/repo.git', { owner: 'owner', repo: 'repo' }],
    ['git@github.com:owner/repo.git', { owner: 'owner', repo: 'repo' }],
    ['ssh://git@github.com/owner/repo.git', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo?tab=readme-ov-file#install', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo/issues/42', { owner: 'owner', repo: 'repo' }],
    ['https://api.github.com/repos/owner/repo', { owner: 'owner', repo: 'repo' }],
    [
      'https://github.com/owner/repo/tree/main',
      { owner: 'owner', repo: 'repo', ref: 'main' },
    ],
    [
      'https://github.com/owner/repo/tree/main/src/lib',
      { owner: 'owner', repo: 'repo', ref: 'main', path: 'src/lib' },
    ],
    [
      'https://github.com/owner/repo/blob/dev/src/index.ts',
      { owner: 'owner', repo: 'repo', ref: 'dev', path: 'src/index.ts' },
    ],
    [
      'https://raw.githubusercontent.com/owner/repo/main/src/a.ts',
      { owner: 'owner', repo: 'repo', ref: 'main', path: 'src/a.ts' },
    ],
    ['owner/repo.js', { owner: 'owner', repo: 'repo.js' }],
    ['Owner-Name/some_repo.v2', { owner: 'Owner-Name', repo: 'some_repo.v2' }],
  ];

  it.each(cases)('parses %s', (input, expected) => {
    expect(parseRepoUrl(input)).toEqual(expected);
  });

  it('decodes percent-encoded segments', () => {
    expect(parseRepoUrl('https://github.com/owner/repo/tree/main/src/my%20dir')).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'main',
      path: 'src/my dir',
    });
  });

  const invalid: Array<[string, string]> = [
    ['empty input', ''],
    ['whitespace only', '   '],
    ['missing repository', 'owner'],
    ['non-github host', 'https://gitlab.com/owner/repo'],
    ['unsupported protocol', 'ftp://github.com/owner/repo'],
    ['invalid owner', 'https://github.com/-bad-owner/repo'],
    ['api path that is not /repos', 'https://api.github.com/users/owner'],
  ];

  it.each(invalid)('rejects %s', (_label, input) => {
    expect(() => parseRepoUrl(input)).toThrow(AppError);
    try {
      parseRepoUrl(input);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('INVALID_URL');
      expect((error as AppError).hint).toBeTruthy();
    }
  });
});

describe('helpers', () => {
  it('builds a canonical repository URL', () => {
    expect(repositoryUrl({ owner: 'a', repo: 'b' })).toBe('https://github.com/a/b');
  });

  it('formats coordinates for display', () => {
    expect(formatCoordinates({ owner: 'a', repo: 'b' })).toBe('a/b');
    expect(formatCoordinates({ owner: 'a', repo: 'b', ref: 'main' })).toBe('a/b@main');
    expect(formatCoordinates({ owner: 'a', repo: 'b', ref: 'main', path: 'src' })).toBe(
      'a/b@main:src',
    );
  });
});
