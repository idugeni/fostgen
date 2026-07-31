/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '@/app/api/structure/route';
import { type ApiErrorPayload, type StructurePayload } from '@/lib/api/schema';

const REPO_FIXTURE = {
  name: 'repo',
  full_name: 'owner/repo',
  owner: { login: 'owner' },
  description: null,
  default_branch: 'main',
  html_url: 'https://github.com/owner/repo',
  homepage: null,
  language: null,
  license: null,
  topics: [],
};

const TREE_FIXTURE = {
  sha: 'tree-sha',
  truncated: false,
  tree: [
    { path: 'src', type: 'tree' },
    { path: 'src/index.ts', type: 'blob', size: 42 },
    { path: 'README.md', type: 'blob', size: 7 },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/structure${query}`);
}

describe('GET /api/structure', () => {
  it('returns a nested tree plus repository metadata', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(REPO_FIXTURE))
      .mockResolvedValueOnce(jsonResponse(TREE_FIXTURE));

    const response = await GET(request('?url=owner/repo'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=');

    const payload = (await response.json()) as StructurePayload;
    expect(payload.repository.fullName).toBe('owner/repo');
    expect(payload.ref).toBe('main');
    expect(payload.path).toBeNull();
    expect(payload.entryCount).toBe(3);
    expect(payload.nodes.map((node) => node.name)).toEqual(['src', 'README.md']);
    expect(payload.nodes[0]?.children?.[0]).toMatchObject({ name: 'index.ts', size: 42 });
  });

  it('scopes the tree to a sub-directory', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(REPO_FIXTURE))
      .mockResolvedValueOnce(jsonResponse(TREE_FIXTURE));

    const response = await GET(request('?url=owner/repo&path=src'));
    const payload = (await response.json()) as StructurePayload;

    expect(payload.path).toBe('src');
    expect(payload.nodes.map((node) => node.name)).toEqual(['index.ts']);
  });

  it('rejects a missing url with INVALID_REQUEST', async () => {
    const response = await GET(request(''));
    expect(response.status).toBe(400);

    const body = (await response.json()) as ApiErrorPayload;
    expect(body.error.code).toBe('INVALID_REQUEST');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a non-GitHub url with INVALID_URL before calling GitHub', async () => {
    const response = await GET(request('?url=https://gitlab.com/owner/repo'));
    expect(response.status).toBe(400);

    const body = (await response.json()) as ApiErrorPayload;
    expect(body.error.code).toBe('INVALID_URL');
    expect(body.error.hint).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propagates a GitHub 404 as NOT_FOUND and disables caching', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not Found' }, 404));

    const response = await GET(request('?url=owner/missing'));
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');

    const body = (await response.json()) as ApiErrorPayload;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('sets Retry-After when GitHub rate limits the request', async () => {
    const reset = Math.floor(Date.now() / 1000) + 120;
    fetchMock.mockResolvedValue(
      new Response('{}', {
        status: 403,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(reset),
        },
      }),
    );

    const response = await GET(request('?url=owner/repo'));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});
