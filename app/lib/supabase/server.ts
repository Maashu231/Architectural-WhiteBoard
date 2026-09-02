/**
 * Server-side Supabase client.
 *
 * Use this in Server Components, API Route Handlers, and Server Actions.
 * It reads/writes auth tokens from/to the Next.js cookie jar so that
 * Supabase RLS policies are enforced per-user.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies cannot be set. This can be safely ignored if you have
            // middleware/proxy refreshing sessions.
          }
        },
      },
    }
  );
}
