'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';

import { isApiErrorPayload, type StructurePayload } from '@/lib/api/schema';
import { type ErrorCode } from '@/lib/errors';

export interface StructureRequest {
  url: string;
  ref?: string;
  path?: string;
}

export interface StructureError {
  code: ErrorCode;
  message: string;
  hint?: string;
}

export type StructureStatus = 'idle' | 'loading' | 'success' | 'error';

interface State {
  status: StructureStatus;
  data: StructurePayload | null;
  error: StructureError | null;
  /** The request that produced `data`, so the UI can label the result. */
  request: StructureRequest | null;
}

type Action =
  | { type: 'start'; request: StructureRequest }
  | { type: 'success'; data: StructurePayload }
  | { type: 'failure'; error: StructureError }
  | { type: 'reset' };

const INITIAL_STATE: State = { status: 'idle', data: null, error: null, request: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return { status: 'loading', data: null, error: null, request: action.request };
    case 'success':
      return { ...state, status: 'success', data: action.data, error: null };
    case 'failure':
      return { ...state, status: 'error', data: null, error: action.error };
    case 'reset':
      return INITIAL_STATE;
    default:
      return state;
  }
}

function buildQuery(request: StructureRequest): string {
  const params = new URLSearchParams({ url: request.url });
  if (request.ref) params.set('ref', request.ref);
  if (request.path) params.set('path', request.path);
  return params.toString();
}

async function readError(response: Response): Promise<StructureError> {
  try {
    const body: unknown = await response.json();
    if (isApiErrorPayload(body)) {
      return {
        code: body.error.code,
        message: body.error.message,
        ...(body.error.hint ? { hint: body.error.hint } : {}),
      };
    }
  } catch {
    // Fall through to the generic message below.
  }

  return {
    code: 'UPSTREAM',
    message: `The server responded with ${response.status}.`,
    hint: 'Please try again in a moment.',
  };
}

/**
 * Owns the lifecycle of a structure request.
 *
 * A single in-flight request is tracked via `AbortController`, so rapid
 * re-submissions cannot produce out-of-order results, and navigating away does
 * not leave a dangling state update.
 */
export function useRepoStructure(): {
  state: State;
  generate: (request: StructureRequest) => Promise<StructurePayload | null>;
  reset: () => void;
} {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const controller = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  const generate = useCallback(
    async (request: StructureRequest): Promise<StructurePayload | null> => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;

      dispatch({ type: 'start', request });

      try {
        const response = await fetch(`/api/structure?${buildQuery(request)}`, {
          signal: current.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          dispatch({ type: 'failure', error: await readError(response) });
          return null;
        }

        const data = (await response.json()) as StructurePayload;
        dispatch({ type: 'success', data });
        return data;
      } catch (cause) {
        // An abort is a deliberate supersede, not a user-facing failure.
        if (current.signal.aborted) return null;

        dispatch({
          type: 'failure',
          error: {
            code: 'NETWORK',
            message: 'Could not reach the server.',
            hint: cause instanceof Error ? cause.message : undefined,
          },
        });
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    dispatch({ type: 'reset' });
  }, []);

  return { state, generate, reset };
}
