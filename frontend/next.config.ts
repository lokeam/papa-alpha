import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

// 'unsafe-eval' is only required by Next.js Fast Refresh / HMR in development;
// production builds do not need it, so it is omitted there.
// 'unsafe-inline' for script-src remains because Next.js injects inline scripts
// for hydration that cannot be nonce-gated without custom server middleware.
// See https://github.com/vercel/next.js/discussions/54907
const scriptSrc = ["'self'", "'unsafe-inline'", isDev ? "'unsafe-eval'" : ""]
  .filter(Boolean)
  .join(' ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src ${scriptSrc};
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https://ui-avatars.com;
      connect-src 'self';
      object-src 'none';
      base-uri 'self';
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim(),
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
