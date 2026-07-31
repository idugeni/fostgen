import type { NextConfig } from 'next';

/**
 * Baseline security headers applied to every response.
 *
 * A strict Content-Security-Policy is intentionally omitted here: the theme
 * bootstrap script in the root layout runs inline, which would require nonce
 * plumbing through a proxy. Everything else that can be hardened statically is.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders.map((header) => ({ ...header })),
      },
    ];
  },
};

export default nextConfig;
