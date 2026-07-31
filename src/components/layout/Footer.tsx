import { siteConfig } from '@/lib/config';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-ink-subtle sm:flex-row sm:px-6">
        <p>
          {siteConfig.name} — built with Next.js. Repository data comes from the public GitHub API.
        </p>
        <nav className="flex items-center gap-4" aria-label="Footer">
          <a
            href={siteConfig.repository}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-ink"
          >
            Source
          </a>
          <a
            href={`${siteConfig.repository}/issues`}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-ink"
          >
            Report an issue
          </a>
          <a
            href={`${siteConfig.repository}/blob/main/LICENCE`}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-ink"
          >
            MIT
          </a>
        </nav>
      </div>
    </footer>
  );
}
