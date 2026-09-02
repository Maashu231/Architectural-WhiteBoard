/**
 * Next.js 16 Proxy — replaces the deprecated middleware.ts convention.
 *
 * Refreshes Supabase auth sessions on every request and redirects
 * unauthenticated users to /login.
 */
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
