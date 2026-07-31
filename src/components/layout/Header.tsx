import { FolderTree } from 'lucide-react';
import Link from 'next/link';

import { GithubMark } from '@/components/icons/GithubMark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { siteConfig } from '@/lib/config';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-ink">
            <FolderTree aria-hidden className="size-4.5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold">{siteConfig.name}</span>
            <span className="text-[0.6875rem] text-ink-subtle">{siteConfig.tagline}</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <kbd className="hidden rounded-md border border-line bg-elevated px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-subtle sm:inline-block">
            ⌘K
          </kbd>
          <a
            href={siteConfig.repository}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="View FostGen on GitHub"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
          >
            <GithubMark className="size-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
