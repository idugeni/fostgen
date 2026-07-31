import { FolderX } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <FolderX aria-hidden className="size-8 text-ink-subtle" />
      <h1 className="text-xl font-semibold text-ink">That page does not exist</h1>
      <p className="text-sm text-ink-muted">
        The link may be out of date. Head back to the generator to build a folder structure.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-xl bg-brand px-4 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-hover"
      >
        Back to FostGen
      </Link>
    </main>
  );
}
