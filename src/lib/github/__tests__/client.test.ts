/**
 * @jest-environment node
 */
import { AppError } from '@/lib/errors';
import { fetchRepository, fetchTree, resolveStructure, scopeToPath } from '@/lib/github/client';
import { type GitTreeEntry } from '@/lib/github/types';

const REPO_FIXTURE = {
  name: 'repo',
  full_name: 'owner/repo',
  owner: { login: 'owner' },
  description: 'A test repository',
  default_branch: 'trunk',
  html_url: 'https://github.com/owner/repo',
  homepage: null,
  language: 'TypeScript',
  license: { spdx_id: 'MIT', name: 'MIT License' },
  topics: ['testing'],
  stargazers_count: 12,
  forks_count: 3,
  subscribers_count: 4,
  open_issues_count: 1,
  size: 2048,
  fork: false,
  archived: false,
  is_template: false,
  pushed_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-02T00:00:00Z',
};

function jsonResponse(
  body: unknown,
  options: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: {
      'content-type': 'application/json',
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '59',
      'x-ratelimit-reset': '1900000000',
      ...options.headers,
    },
  });
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  delete process.env.GITHUB_TOKEN;
});

async function expectAppError(promise: Promise<unknown>, code: string): Promise<AppError> {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  try {
    await promise;
    throw new Error('expected the promise to reject');
  } catch (error) {
    expect((error as AppError).code).toBe(code);
    return error as AppError;
  }
}

describe('fetchRepository', () => {
  it('maps the GitHub payload onto RepositoryMeta', async () => {
    fetchMock.mockResolvedValue(jsonResponse(REPO_FIXTURE));

    const { repository, rateLimit } = await fetchRepository('owner', 'repo');

    expect(repository).toMatchObject({
      owner: 'owner',
      name: 'repo',
      fullName: 'owner/repo',
      defaultBranch: 'trunk',
      license: 'MIT',
      stars: 12,
      forks: 3,
      watchers: 4,
      sizeKb: 2048,
    });
    expect(rateLimit).toEqual({
      limit: 60,
      remaining: 59,
      reset: 1900000000,
      authenticated: false,
    });
  });

  it('falls back to main when GitHub omits the default branch', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...REPO_FIXTURE, default_branch: null }));
    const { repository } = await fetchRepository('owner', 'repo');
    expect(repository.defaultBranch).toBe('main');
  });

  it('sends an Authorization header only when a token is configured', async () => {
    fetchMock.mockResolvedValue(jsonResponse(REPO_FIXTURE));
    await fetchRepository('owner', 'repo');
    const anonymousHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(anonymousHeaders.Authorization).toBeUndefined();

    process.env.GITHUB_TOKEN = 'secret';
    fetchMock.mockResolvedValue(jsonResponse(REPO_FIXTURE));
    const { rateLimit } = await fetchRepository('owner', 'repo');
    const authedHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(authedHeaders.Authorization).toBe('Bearer secret');
    expect(rateLimit?.authenticated).toBe(true);
  });

  it('maps 404 to NOT_FOUND', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not Found' }, { status: 404 }));
    const error = await expectAppError(fetchRepository('owner', 'nope'), 'NOT_FOUND');
    expect(error.status).toBe(404);
  });

  it('maps an exhausted quota to RATE_LIMITED with a retry hint', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({}, { status: 403, headers: { 'x-ratelimit-remaining': '0' } }),
    );

    const error = await expectAppError(fetchRepository('owner', 'repo'), 'RATE_LIMITED');
    expect(error.status).toBe(429);
    expect(error.hint).toContain('GITHUB_TOKEN');
  });

  it('distinguishes a plain 403 from a rate limit', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 403 }));
    await expectAppError(fetchRepository('owner', 'repo'), 'UNAUTHORIZED');
  });

  it('maps 401 to UNAUTHORIZED', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 401 }));
    await expectAppError(fetchRepository('owner', 'repo'), 'UNAUTHORIZED');
  });

  it('maps 451 to UNAVAILABLE and 5xx to UPSTREAM', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 451 }));
    await expectAppError(fetchRepository('owner', 'repo'), 'UNAVAILABLE');

    fetchMock.mockResolvedValue(jsonResponse({}, { status: 500 }));
    await expectAppError(fetchRepository('owner', 'repo'), 'UPSTREAM');
  });

  it('wraps transport failures as NETWORK', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expectAppError(fetchRepository('owner', 'repo'), 'NETWORK');
  });
});

describe('fetchTree', () => {
  it('normalises entries and surfaces truncation', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        sha: 'abc',
        truncated: true,
        tree: [
          { path: 'src', type: 'tree' },
          { path: 'src/a.ts', type: 'blob', size: 10, sha: 'def', mode: '100644' },
          { path: '', type: 'blob' },
          { path: 'weird', type: 'unknown-type' },
        ],
      }),
    );

    const result = await fetchTree('owner', 'repo', 'main');

    expect(result.truncated).toBe(true);
    expect(result.sha).toBe('abc');
    expect(result.entries).toEqual([
      { path: 'src', type: 'tree' },
      { path: 'src/a.ts', type: 'blob', size: 10, sha: 'def', mode: '100644' },
    ]);
  });

  it('rejects a payload without a tree array', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ sha: 'abc' }));
    await expectAppError(fetchTree('owner', 'repo', 'main'), 'UPSTREAM');
  });
});

describe('scopeToPath', () => {
  const entries: GitTreeEntry[] = [
    { path: 'src', type: 'tree' },
    { path: 'src/lib', type: 'tree' },
    { path: 'src/lib/a.ts', type: 'blob' },
    { path: 'README.md', type: 'blob' },
  ];

  it('returns the input unchanged without a path', () => {
    expect(scopeToPath(entries, undefined)).toBe(entries);
    expect(scopeToPath(entries, '/')).toBe(entries);
  });

  it('strips the prefix from nested entries', () => {
    expect(scopeToPath(entries, 'src')).toEqual([
      { path: 'lib', type: 'tree' },
      { path: 'lib/a.ts', type: 'blob' },
    ]);
  });

  it('tolerates surrounding slashes', () => {
    expect(scopeToPath(entries, '/src/lib/')).toEqual([{ path: 'a.ts', type: 'blob' }]);
  });

  it('rejects a path that does not exist', () => {
    expect(() => scopeToPath(entries, 'missing')).toThrow(AppError);
  });

  it('rejects a path that points at a file', () => {
    const error = (() => {
      try {
        scopeToPath(entries, 'README.md');
        return null;
      } catch (thrown) {
        return thrown as AppError;
      }
    })();

    expect(error?.code).toBe('PATH_NOT_FOUND');
    expect(error?.message).toContain('is a file');
  });
});

describe('resolveStructure', () => {
  const treePayload = {
    sha: 'tree-sha',
    truncated: false,
    tree: [
      { path: 'src', type: 'tree' },
      { path: 'src/a.ts', type: 'blob', size: 1 },
    ],
  };

  it('uses the default branch when no ref is supplied', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(REPO_FIXTURE))
      .mockResolvedValueOnce(jsonResponse(treePayload));

    const result = await resolveStructure({ owner: 'owner', repo: 'repo' });

    expect(result.ref).toBe('trunk');
    expect(result.path).toBeNull();
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/git/trees/trunk?recursive=1');
  });

  it('widens a slash-containing ref when the first guess 404s', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(REPO_FIXTURE))
      .mockResolvedValueOnce(jsonResponse({}, { status: 404 }))
      .mockResolvedValueOnce(jsonResponse(treePayload));

    const result = await resolveStructure({
      owner: 'owner',
      repo: 'repo',
      ref: 'release',
      path: '2026-07/src',
    });

    expect(result.ref).toBe('release/2026-07');
    expect(result.path).toBe('src');
    expect(result.entries).toEqual([{ path: 'a.ts', type: 'blob', size: 1 }]);
  });

  it('reports BRANCH_NOT_FOUND when every candidate 404s', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(REPO_FIXTURE))
      .mockResolvedValue(jsonResponse({}, { status: 404 }));

    const error = await expectAppError(
      resolveStructure({ owner: 'owner', repo: 'repo', ref: 'ghost' }),
      'BRANCH_NOT_FOUND',
    );
    expect(error.hint).toContain('trunk');
  });

  it('reports EMPTY_REPOSITORY for a repository with no entries', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(REPO_FIXTURE))
      .mockResolvedValueOnce(jsonResponse({ sha: 'x', tree: [] }));

    await expectAppError(resolveStructure({ owner: 'owner', repo: 'repo' }), 'EMPTY_REPOSITORY');
  });
});
