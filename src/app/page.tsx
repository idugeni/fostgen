import { FileCode2, Filter, KeyRound, Zap } from 'lucide-react';

import { StructureGenerator } from '@/components/generator/StructureGenerator';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getSiteUrl, siteConfig } from '@/lib/config';

const FEATURES = [
  {
    icon: FileCode2,
    title: 'Five output formats',
    body: 'ASCII tree, Markdown list, JSON, YAML or a flat path list — switch without refetching.',
  },
  {
    icon: Filter,
    title: 'Precise filtering',
    body: 'Depth limits plus gitignore-style patterns, including negation to re-include a path.',
  },
  {
    icon: Zap,
    title: 'Cached on the server',
    body: 'Repository lookups are resolved server-side and cached, so repeat requests are instant.',
  },
  {
    icon: KeyRound,
    title: 'Token-aware',
    body: 'An optional GITHUB_TOKEN lifts the rate limit to 5,000 requests per hour and never reaches the browser.',
  },
] as const;

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: siteConfig.name,
  alternateName: siteConfig.tagline,
  description: siteConfig.description,
  url: getSiteUrl(),
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, author-controlled JSON-LD; no user input is interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-4 sm:px-6 sm:pt-14">
        <section className="mx-auto mb-10 max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Folder structures from any GitHub repository
          </h1>
          <p className="mt-3 text-base text-ink-muted">{siteConfig.description}</p>
        </section>

        <StructureGenerator />

        <section aria-labelledby="features-heading" className="mt-16">
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-2xl border border-line bg-surface p-5">
                <Icon aria-hidden className="size-5 text-brand" />
                <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </>
  );
}
