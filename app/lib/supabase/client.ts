/**
 * Browser-side Supabase client.
 *
 * Use this in client components ('use client') for auth state,
 * real-time subscriptions, and data fetches that respect RLS
 * through the user's session cookie.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
