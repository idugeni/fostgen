'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/*
 * localStorage is an external store, so it is read through
 * `useSyncExternalStore` rather than mirrored into component state. That gives
 * three things for free:
 *
 * - hydration safety: `getServerSnapshot` returns `null`, so the first client
 *   render matches the server output before the stored value is adopted,
 * - cross-tab sync via the `storage` event,
 * - no `setState` inside an effect, and therefore no cascading render.
 */
const listeners = new Map<string, Set<() => void>>();

/*
 * The snapshot is read straight from localStorage on every call. No cache is
 * needed: `useSyncExternalStore` compares snapshots with `===`, and two reads of
 * the same stored string are equal as primitives. Skipping the cache also means
 * there is no stale state to invalidate.
 */
function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function notify(key: string): void {
  listeners.get(key)?.forEach((listener) => listener());
}

function writeRaw(key: string, raw: string | null): void {
  try {
    if (raw === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, raw);
  } catch {
    // Quota exceeded or storage disabled: nothing to persist, nothing to do.
  }
  notify(key);
}

function onStorageEvent(event: StorageEvent): void {
  if (event.key === null) {
    listeners.forEach((_, key) => notify(key));
    return;
  }
  if (listeners.has(event.key)) notify(event.key);
}

function subscribeToKey(key: string, listener: () => void): () => void {
  let bucket = listeners.get(key);
  if (!bucket) {
    bucket = new Set();
    listeners.set(key, bucket);
  }
  bucket.add(listener);

  if (listeners.size === 1 && bucket.size === 1) {
    window.addEventListener('storage', onStorageEvent);
  }

  return () => {
    bucket.delete(listener);
    if (bucket.size === 0) listeners.delete(key);
    if (listeners.size === 0) window.removeEventListener('storage', onStorageEvent);
  };
}

function getServerSnapshot(): string | null {
  return null;
}

export interface UseLocalStorageResult<T> {
  value: T;
  setValue: (next: T | ((current: T) => T)) => void;
  reset: () => void;
}

/**
 * JSON-backed persisted state.
 *
 * `fallback` and `validate` must be referentially stable (module-level
 * constants and functions) — they participate in memoisation.
 *
 * @param validate Returns the accepted value, or `null` to fall back. Use it to
 * reject stale or hand-edited payloads instead of crashing at render time.
 */
export function useLocalStorage<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => T | null,
): UseLocalStorageResult<T> {
  const subscribe = useCallback(
    (listener: () => void) => subscribeToKey(key, listener),
    [key],
  );
  const getSnapshot = useCallback(() => readRaw(key), [key]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<T>(() => {
    if (raw === null) return fallback;
    try {
      const parsed: unknown = JSON.parse(raw);
      const accepted = validate ? validate(parsed) : (parsed as T);
      return accepted === null ? fallback : accepted;
    } catch {
      return fallback;
    }
  }, [raw, fallback, validate]);

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (input: T) => T)(value) : next;
      writeRaw(key, JSON.stringify(resolved));
    },
    [key, value],
  );

  const reset = useCallback(() => {
    writeRaw(key, null);
  }, [key]);

  return { value, setValue, reset };
}
