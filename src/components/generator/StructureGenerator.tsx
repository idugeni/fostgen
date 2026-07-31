'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ErrorNotice } from '@/components/generator/ErrorNotice';
import { OptionsPanel } from '@/components/generator/OptionsPanel';
import { OutputPanel } from '@/components/generator/OutputPanel';
import { RecentRepositories } from '@/components/generator/RecentRepositories';
import { RepoForm, type RepoFormValues } from '@/components/generator/RepoForm';
import { RepositorySummary } from '@/components/generator/RepositorySummary';
import { useToast } from '@/components/ui/Toaster';
import { useClipboard } from '@/hooks/useClipboard';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRepoStructure, type StructureRequest } from '@/hooks/useRepoStructure';
import {
  DEFAULT_GENERATOR_OPTIONS,
  MAX_RECENT_REPOSITORIES,
  OPTIONS_STORAGE_KEY,
  RECENT_REPOS_STORAGE_KEY,
  parseGeneratorOptions,
  parseRecentRepositories,
  type GeneratorOptions,
} from '@/lib/config';
import { toAppError } from '@/lib/errors';
import { parseRepoUrl } from '@/lib/github/parse-repo-url';
import { downloadFileName } from '@/lib/tree/render';
import { deriveStructure } from '@/lib/tree/pipeline';
import { downloadTextFile, mimeTypeForFileName } from '@/lib/utils/download';

const EMPTY_FORM: RepoFormValues = { url: '', ref: '', path: '' };

/** Module-level so the identity is stable across renders (see useLocalStorage). */
const NO_RECENTS: string[] = [];

/** `src/components` -> `components`, so the tree root matches what is rendered. */
function rootLabel(repositoryName: string, path: string | null): string {
  if (!path) return repositoryName;
  const segments = path.split('/').filter(Boolean);
  return segments.at(-1) ?? repositoryName;
}

export function StructureGenerator() {
  const { notify } = useToast();
  const { state, generate, reset } = useRepoStructure();
  const { copy, copied } = useClipboard();

  const options = useLocalStorage<GeneratorOptions>(
    OPTIONS_STORAGE_KEY,
    DEFAULT_GENERATOR_OPTIONS,
    parseGeneratorOptions,
  );
  const recents = useLocalStorage<string[]>(
    RECENT_REPOS_STORAGE_KEY,
    NO_RECENTS,
    parseRecentRepositories,
  );

  const [form, setForm] = useState<RepoFormValues>(EMPTY_FORM);
  const [validationMessage, setValidationMessage] = useState<string | undefined>(undefined);
  const [wrapLines, setWrapLines] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loading = state.status === 'loading';
  const payload = state.data;

  const rootName = payload ? rootLabel(payload.repository.name, payload.path) : '';

  // Re-deriving is pure and cheap, so every option change is instant and needs
  // no extra request to GitHub.
  const derived = useMemo(
    () => (payload ? deriveStructure(payload.nodes, options.value, rootName) : null),
    [payload, options.value, rootName],
  );

  const updateForm = useCallback((patch: Partial<RepoFormValues>) => {
    setForm((current) => ({ ...current, ...patch }));
    if (patch.url !== undefined) setValidationMessage(undefined);
  }, []);

  const updateOptions = useCallback(
    (patch: Partial<GeneratorOptions>) => {
      options.setValue((current) => ({ ...current, ...patch }));
    },
    [options],
  );

  const rememberRepository = useCallback(
    (slug: string) => {
      recents.setValue((current) =>
        [slug, ...current.filter((item) => item !== slug)].slice(0, MAX_RECENT_REPOSITORIES),
      );
    },
    [recents],
  );

  const submit = useCallback(
    async (values: RepoFormValues = form) => {
      const trimmedUrl = values.url.trim();
      if (!trimmedUrl) {
        setValidationMessage('Enter a repository first.');
        inputRef.current?.focus();
        return;
      }

      let coordinates;
      try {
        coordinates = parseRepoUrl(trimmedUrl);
      } catch (cause) {
        const error = toAppError(cause);
        setValidationMessage(error.hint ?? error.message);
        notify.error({
          title: error.message,
          ...(error.hint ? { description: error.hint } : {}),
        });
        inputRef.current?.focus();
        return;
      }

      setValidationMessage(undefined);

      const ref = values.ref.trim() || coordinates.ref;
      const path = values.path.trim().replace(/^\/+|\/+$/g, '') || coordinates.path;

      const request: StructureRequest = {
        url: `${coordinates.owner}/${coordinates.repo}`,
        ...(ref ? { ref } : {}),
        ...(path ? { path } : {}),
      };

      const result = await generate(request);
      if (!result) return;

      rememberRepository(`${coordinates.owner}/${coordinates.repo}`);
      setForm({
        url: values.url,
        ref: result.ref,
        path: result.path ?? '',
      });

      notify.success({
        title: `${result.repository.fullName} resolved`,
        description: `${result.entryCount.toLocaleString('en-US')} entries on ${result.ref}.`,
      });

      if (result.truncated) {
        notify.warning({
          title: 'GitHub truncated this tree',
          description: 'Scope to a sub-directory for a complete listing.',
        });
      }
    },
    [form, generate, notify, rememberRepository],
  );

  // Surface server-side failures as a toast as well as the inline notice.
  const lastReportedError = useRef<string | null>(null);
  useEffect(() => {
    if (state.status !== 'error' || !state.error) return;
    const signature = `${state.error.code}:${state.error.message}`;
    if (lastReportedError.current === signature) return;
    lastReportedError.current = signature;
    notify.error({
      title: state.error.message,
      ...(state.error.hint ? { description: state.error.hint } : {}),
    });
  }, [state.status, state.error, notify]);

  const handleReset = useCallback(() => {
    reset();
    setForm(EMPTY_FORM);
    setValidationMessage(undefined);
    lastReportedError.current = null;
    inputRef.current?.focus();
  }, [reset]);

  const handleCopy = useCallback(async () => {
    if (!derived?.output) return;
    const ok = await copy(derived.output);
    if (ok) notify.info({ title: 'Structure copied to the clipboard' });
    else notify.error({ title: 'Could not access the clipboard' });
  }, [copy, derived, notify]);

  const handleDownload = useCallback(() => {
    if (!derived?.output) return;
    const fileName = downloadFileName(rootName, options.value.format);
    downloadTextFile(derived.output, fileName, mimeTypeForFileName(fileName));
    notify.success({ title: 'Download started', description: fileName });
  }, [derived, notify, options.value.format, rootName]);

  // Keyboard shortcuts: ⌘/Ctrl+K focuses the field, ⌘/Ctrl+Enter generates.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;

      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      if (event.key === 'Enter' && !loading) {
        event.preventDefault();
        void submit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, submit]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <RepoForm
          values={form}
          onChange={updateForm}
          onSubmit={() => void submit()}
          onReset={handleReset}
          loading={loading}
          canReset={form.url.length > 0 || state.status !== 'idle'}
          inputRef={inputRef}
          {...(validationMessage ? { validationMessage } : {})}
        />
      </div>

      <RecentRepositories
        items={recents.value}
        onSelect={(item) => {
          const next: RepoFormValues = { url: item, ref: '', path: '' };
          setForm(next);
          void submit(next);
        }}
        onRemove={(item) =>
          recents.setValue((current) => current.filter((entry) => entry !== item))
        }
        onClear={recents.reset}
      />

      {state.status === 'error' && state.error ? <ErrorNotice error={state.error} /> : null}

      {payload ? (
        <RepositorySummary
          repository={payload.repository}
          gitRef={payload.ref}
          path={payload.path}
          truncated={payload.truncated}
          rateLimit={payload.rateLimit}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <OutputPanel
          output={derived?.output ?? ''}
          format={options.value.format}
          stats={derived?.stats ?? null}
          loading={loading}
          copied={copied}
          wrapLines={wrapLines}
          onToggleWrap={() => setWrapLines((value) => !value)}
          onCopy={() => void handleCopy()}
          onDownload={handleDownload}
        />

        <div className="lg:sticky lg:top-6 lg:self-start">
          <OptionsPanel
            options={options.value}
            onChange={updateOptions}
            onResetDefaults={() => options.setValue(DEFAULT_GENERATOR_OPTIONS)}
          />
        </div>
      </div>
    </div>
  );
}
