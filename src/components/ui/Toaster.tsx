'use client';

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils/cn';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastInput {
  title: string;
  description?: string;
  /** Milliseconds before auto-dismiss. `0` keeps the toast until dismissed. */
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  dismiss: (id: string) => void;
  notify: Record<ToastTone, (input: ToastInput | string) => string>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 7000;

const TONE_STYLES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'border-success/35 bg-success-soft text-success' },
  info: { icon: Info, className: 'border-brand/35 bg-brand-soft text-brand' },
  warning: { icon: AlertTriangle, className: 'border-warning/35 bg-warning-soft text-warning' },
  error: { icon: XCircle, className: 'border-danger/35 bg-danger-soft text-danger' },
};

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, input: ToastInput | string): string => {
      const normalised: ToastInput = typeof input === 'string' ? { title: input } : input;
      const id = createId();

      setToasts((current) => {
        const next: Toast = {
          id,
          tone,
          title: normalised.title,
          ...(normalised.description ? { description: normalised.description } : {}),
        };
        return [...current, next].slice(-MAX_VISIBLE);
      });

      const duration =
        normalised.duration ?? (tone === 'error' ? ERROR_DURATION : DEFAULT_DURATION);

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }

      return id;
    },
    [dismiss],
  );

  // Clear pending timers if the provider unmounts mid-flight.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const notify = useMemo<ToastContextValue['notify']>(
    () => ({
      success: (input) => push('success', input),
      info: (input) => push('info', input),
      warning: (input) => push('warning', input),
      error: (input) => push('error', input),
    }),
    [push],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, dismiss, notify }),
    [toasts, dismiss, notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      // `polite` avoids interrupting whatever the user is doing; errors below
      // additionally use role="alert" so they are announced immediately.
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {toasts.map((toast) => {
        const { icon: Icon, className } = TONE_STYLES[toast.tone];
        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur',
              className,
            )}
          >
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium break-words">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-xs break-words opacity-80">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label={`Dismiss: ${toast.title}`}
              className="-mr-1 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
