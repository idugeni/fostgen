'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { THEME_STORAGE_KEY } from '@/lib/config';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Cycles system -> light -> dark -> system. */
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const LIGHT_QUERY = '(prefers-color-scheme: light)';

function isPreference(value: string | null): value is ThemePreference {
  return value !== null && (THEME_PREFERENCES as readonly string[]).includes(value);
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function readSystemTheme(): ResolvedTheme {
  if (!window.matchMedia) return 'dark';
  return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark';
}

/*
 * Theme lives outside React (localStorage + a media query), so it is exposed
 * through `useSyncExternalStore`. That is what lets the first client render
 * match the server output and then adopt the real value without a setState
 * inside an effect.
 *
 * The snapshot is a single string because `useSyncExternalStore` requires a
 * referentially stable value between notifications.
 */
type Snapshot = `${ThemePreference}|${ResolvedTheme}`;

const SERVER_SNAPSHOT: Snapshot = 'system|dark';

const listeners = new Set<() => void>();
let snapshot: Snapshot | null = null;

function computeSnapshot(): Snapshot {
  return `${readStoredPreference()}|${readSystemTheme()}`;
}

function getSnapshot(): Snapshot {
  snapshot ??= computeSnapshot();
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function invalidate(): void {
  const next = computeSnapshot();
  if (next === snapshot) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const query = window.matchMedia?.(LIGHT_QUERY);
  query?.addEventListener('change', invalidate);
  // Keep other tabs in sync.
  window.addEventListener('storage', invalidate);

  return () => {
    listeners.delete(listener);
    query?.removeEventListener('change', invalidate);
    window.removeEventListener('storage', invalidate);
  };
}

function parseSnapshot(value: Snapshot): { preference: ThemePreference; system: ResolvedTheme } {
  const [preference, system] = value.split('|') as [ThemePreference, ResolvedTheme];
  return { preference, system };
}

/**
 * The script injected into <head> so the correct theme is applied before the
 * first paint. It must stay in sync with {@link readStoredPreference}.
 */
export const themeBootstrapScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var p=localStorage.getItem(k);var m=window.matchMedia('${LIGHT_QUERY}').matches?'light':'dark';var t=(p==='light'||p==='dark')?p:m;document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { preference, system } = parseSnapshot(current);
  const resolved: ResolvedTheme = preference === 'system' ? system : preference;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); fall through to invalidate so
      // at least the in-memory snapshot is recomputed.
    }
    invalidate();
  }, []);

  const cycle = useCallback(() => {
    const next: ThemePreference =
      preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
    setPreference(next);
  }, [preference, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, cycle }),
    [preference, resolved, setPreference, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return context;
}
