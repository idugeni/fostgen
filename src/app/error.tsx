'use client';

import { AlertOctagon, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Unhandled rendering error', {
      message: error.message,
      ...(error.digest ? { digest: error.digest } : {}),
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertOctagon aria-hidden className="size-8 text-danger" />
      <h1 className="text-xl font-semibold text-ink">Something broke on our side</h1>
      <p className="text-sm text-ink-muted">
        The page hit an unexpected error. Retrying usually resolves it.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-ink-subtle">digest: {error.digest}</p>
      ) : null}
      <Button variant="primary" onClick={reset} icon={<RotateCcw aria-hidden className="size-4" />}>
        Try again
      </Button>
    </main>
  );
}
