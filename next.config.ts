import type { NextConfig } from "next";

// The socket server URL must match NEXT_PUBLIC_SOCKET_URL. We read it at
// build time so the CSP `connect-src` directive includes the correct host.
// In environments where the value isn't set at build time, we fall back to
// allowing the same origin (safe for self-hosted deployments behind a reverse proxy).
const socketUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') || '';

// Supabase project URL is always required.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';

/**
 * Build a strict Content-Security-Policy string.
 *
 * Directive rationale:
 *  - `default-src 'self'`       — baseline; nothing loads unless explicitly allowed
 *  - `script-src 'self' 'unsafe-inline'` — React/Next.js inline scripts; tighten with nonces if feasible
 *  - `style-src 'self' 'unsafe-inline'`  — inline styles used throughout (Tailwind, ReactFlow)
 *  - `img-src 'self' data: blob: https:` — avatars, data URIs, and general HTTPS images
 *  - `font-src 'self' https://fonts.gstatic.com` — Google Fonts if added later
 *  - `connect-src`              — fetch/XHR + Socket.IO WebSocket + Supabase REST/realtime
 *  - `frame-ancestors 'self'`   — replaces X-Frame-Options (belt-and-suspenders)
 *  - `object-src 'none'`        — disallow Flash/plugins
 *  - `base-uri 'self'`          — prevent base tag injection
 */
function buildCSP(): string {
  const connectSrc = [
    "'self'",
    supabaseUrl,
    // Socket.IO needs both http(s):// for polling and ws(s):// for websockets.
    socketUrl,
    socketUrl.replace(/^http/, 'ws'),
  ]
    .filter(Boolean)
    .join(' ');

  const isDev = process.env.NODE_ENV !== 'production';

  const directives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'",
    'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
    'img-src': "'self' data: blob: https:",
    'font-src': "'self' https://fonts.gstatic.com",
    'connect-src': connectSrc,
    'frame-ancestors': "'self'",
    'object-src': "'none'",
    'base-uri': "'self'",
  };

  return Object.entries(directives)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
}

const nextConfig: NextConfig = {
  // Strict mode is enabled by default in Next.js 16+ for new projects.
  // Set to false here to match the existing project convention.
  reactStrictMode: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: buildCSP() },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
