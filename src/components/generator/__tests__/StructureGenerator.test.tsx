import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StructureGenerator } from '@/components/generator/StructureGenerator';
import { ToastProvider } from '@/components/ui/Toaster';
import { type ApiErrorPayload, type StructurePayload } from '@/lib/api/schema';
import { buildTree } from '@/lib/tree/build';

const payload: StructurePayload = {
  repository: {
    owner: 'owner',
    name: 'repo',
    fullName: 'owner/repo',
    description: 'A demo repository',
    defaultBranch: 'main',
    htmlUrl: 'https://github.com/owner/repo',
    homepage: null,
    language: 'TypeScript',
    license: 'MIT',
    topics: [],
    stars: 1234,
    forks: 56,
    watchers: 7,
    openIssues: 2,
    sizeKb: 100,
    isFork: false,
    isArchived: false,
    isTemplate: false,
    pushedAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  },
  ref: 'main',
  path: null,
  truncated: false,
  treeSha: 'tree-sha',
  nodes: buildTree([
    { path: 'src', type: 'tree' },
    { path: 'src/index.ts', type: 'blob', size: 120 },
    { path: 'README.md', type: 'blob', size: 30 },
  ]),
  entryCount: 3,
  rateLimit: null,
};

const fetchMock = jest.fn();

/**
 * jsdom has no `fetch`/`Response`, and the hook only touches `ok`, `status` and
 * `json()`, so a minimal stand-in keeps the test focused on behaviour.
 */
function fakeResponse(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function mockSuccess(overrides: Partial<StructurePayload> = {}): void {
  fetchMock.mockResolvedValue(fakeResponse({ ...payload, ...overrides }, 200));
}

function mockFailure(error: ApiErrorPayload['error'], status = 404): void {
  fetchMock.mockResolvedValue(fakeResponse({ error }, status));
}

function renderGenerator() {
  return render(
    <ToastProvider>
      <StructureGenerator />
    </ToastProvider>,
  );
}

const output = () => screen.getByTestId('structure-output');

async function generate(user: ReturnType<typeof userEvent.setup>, value = 'owner/repo') {
  await user.type(screen.getByLabelText(/github repository/i), value);
  await user.click(screen.getByRole('button', { name: /generate/i }));
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('StructureGenerator', () => {
  it('shows an empty state before anything is generated', () => {
    renderGenerator();

    expect(screen.getByText(/no structure yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('structure-output')).not.toBeInTheDocument();
  });

  it('renders the ASCII tree and repository summary after generating', async () => {
    const user = userEvent.setup();
    mockSuccess();
    renderGenerator();

    await generate(user);

    await waitFor(() => expect(output()).toBeInTheDocument());
    expect(output().textContent).toContain('repo/');
    expect(output().textContent).toContain('├─ src/');
    expect(output().textContent).toContain('└─ README.md');

    const summary = screen.getByRole('region', { name: /repository details/i });
    expect(within(summary).getByText('owner/repo')).toBeInTheDocument();
    expect(within(summary).getByText('1.2K')).toBeInTheDocument();
    expect(within(summary).getByText('main')).toBeInTheDocument();
  });

  it('requests the API with the normalised repository slug', async () => {
    const user = userEvent.setup();
    mockSuccess();
    renderGenerator();

    await generate(user, 'https://github.com/owner/repo/tree/main/src');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('url=owner%2Frepo');
    expect(url).toContain('ref=main');
    expect(url).toContain('path=src');
  });

  it('re-renders a different format without another request', async () => {
    const user = userEvent.setup();
    mockSuccess();
    renderGenerator();

    await generate(user);
    await waitFor(() => expect(output()).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText('Format'), 'json');

    await waitFor(() => expect(output().textContent).toContain('"type": "dir"'));
    expect(() => JSON.parse(output().textContent ?? '')).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('drops files when "Include files" is switched off, without refetching', async () => {
    const user = userEvent.setup();
    mockSuccess();
    renderGenerator();

    await generate(user);
    await waitFor(() => expect(output()).toBeInTheDocument());
    expect(output().textContent).toContain('index.ts');

    await user.click(screen.getByRole('switch', { name: /include files/i }));

    await waitFor(() => expect(output().textContent).not.toContain('index.ts'));
    expect(output().textContent).toContain('src/');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('copies the rendered output to the clipboard', async () => {
    const user = userEvent.setup();
    mockSuccess();
    renderGenerator();

    await generate(user);
    await waitFor(() => expect(output()).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^copy$/i }));

    await expect(navigator.clipboard.readText()).resolves.toContain('├─ src/');
    expect(await screen.findByText(/copied to the clipboard/i)).toBeInTheDocument();
  });

  it('surfaces API errors inline and as an alert', async () => {
    const user = userEvent.setup();
    mockFailure({
      code: 'NOT_FOUND',
      message: 'Repository not found.',
      hint: 'Check the spelling.',
    });
    renderGenerator();

    await generate(user, 'owner/missing');

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((node) => node.textContent?.includes('Repository not found.'))).toBe(true);
    expect(screen.getByText('NOT_FOUND')).toBeInTheDocument();
    expect(screen.queryByTestId('structure-output')).not.toBeInTheDocument();
  });

  it('rejects invalid input before touching the network', async () => {
    const user = userEvent.setup();
    renderGenerator();

    await generate(user, 'https://gitlab.com/owner/repo');

    // The message appears both inline under the field and in a toast.
    expect((await screen.findAllByText(/not a GitHub host/i)).length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('remembers the repository and can re-run it from the recent list', async () => {
    const user = userEvent.setup();
    mockSuccess();
    renderGenerator();

    await generate(user);
    await waitFor(() => expect(output()).toBeInTheDocument());

    const recent = screen.getByRole('region', { name: /recent/i });
    expect(within(recent).getByRole('button', { name: 'owner/repo' })).toBeInTheDocument();

    await user.click(within(recent).getByRole('button', { name: 'owner/repo' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('clears the form and the result', async () => {
    const user = userEvent.setup();
    mockSuccess();
    renderGenerator();

    await generate(user);
    await waitFor(() => expect(output()).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /clear the form/i }));

    expect(screen.getByLabelText(/github repository/i)).toHaveValue('');
    expect(screen.queryByTestId('structure-output')).not.toBeInTheDocument();
    expect(screen.getByText(/no structure yet/i)).toBeInTheDocument();
  });

  it('warns when GitHub truncated the tree', async () => {
    const user = userEvent.setup();
    mockSuccess({ truncated: true });
    renderGenerator();

    await generate(user);

    // Announced twice on purpose: once in the summary panel, once as a toast.
    expect((await screen.findAllByText(/GitHub truncated this tree/i)).length).toBeGreaterThan(0);
  });
});
