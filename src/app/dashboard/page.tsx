'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { getDashboardHref } from '@/utils/routes';
import { backgroundColor } from '@/config/theme';

const MIN_SPLASH_MS = 400;
const AUTH_SETTLE_MS = 800;
const BOOT_HARD_CEILING_MS = 5000;

type AuthResult = { user: User | null; error: Error | null };

function bootDebug(enable: boolean, ...args: unknown[]) {
  if (
    enable &&
    (process.env.NODE_ENV !== 'production' ||
      (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('boot_debug') === '1'))
  ) {
    console.log('[DashboardBoot]', ...args);
  }
}

/**
 * Wait for auth to settle — handles initial session restoration from storage.
 * getSession() can return null on first load before client has hydrated.
 * onAuthStateChange(INITIAL_SESSION) fires once client is ready.
 * Resolves exactly once; always unsubscribes and clears timeout to avoid leaks.
 */
async function waitForAuthSettle(
  supabase: ReturnType<typeof createClient>,
  debug: boolean
): Promise<AuthResult> {
  const { data: { session }, error } = await supabase.auth.getSession();
  bootDebug(debug, 'getSession:', session ? 'found' : 'null', error ? `error=${error.message}` : '');
  if (session?.user) return { user: session.user, error: null };
  if (error) return { user: null, error };

  return new Promise((resolve) => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const finish = (result: AuthResult) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
      resolve(result);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        bootDebug(debug, 'onAuthStateChange:', event, session ? 'has user' : 'no user');
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          finish({ user: session?.user ?? null, error: null });
        }
      }
    );

    timeoutId = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session }, error: err }) => {
        finish({ user: session?.user ?? null, error: err ?? null });
      });
    }, AUTH_SETTLE_MS);
  });
}

/**
 * Dashboard Boot / AppGate page
 *
 * Resolves auth + profile, then redirects to role-specific dashboard.
 * Never 404s — shows branded loading screen during resolution.
 * Resilient when middleware profile fetch fails (e.g. cold Supabase start).
 */
export default function DashboardBootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;

    const debug =
      searchParams.get('boot_debug') === '1' || process.env.NODE_ENV !== 'production';

    const run = async () => {
      const supabase = createClient();
      const splashStart = Date.now();
      let ceilingId: ReturnType<typeof setTimeout> | undefined = undefined;

      const boot = async (): Promise<boolean> => {
        // 1. Wait for auth to settle (getSession + onAuthStateChange window)
        const { user, error: authError } = await waitForAuthSettle(supabase, debug);

        if (authError) {
          bootDebug(debug, 'auth error, redirecting to /');
          router.replace('/');
          return false;
        }

        if (!user) {
          bootDebug(debug, 'no session, redirecting to /');
          router.replace('/');
          return false;
        }

        // 2. Resolve user profile (profiles.user_type is source of truth)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        bootDebug(debug, 'profile fetch:', profile ? `user_type=${profile.user_type}` : 'null', profileError ? `error=${profileError.message}` : '');

        // Unknown/missing profile → welcome (avoids bouncing into matchmakr dashboard)
        const userType = profile?.user_type ?? null;
        if (!userType) {
          bootDebug(debug, 'no user_type, redirecting to /');
          router.replace('/');
          return false;
        }

        const targetHref = getDashboardHref(userType);

        // 3. Prefetch target route for smoother transition
        router.prefetch(targetHref);

        // 4. Enforce minimum splash duration to avoid flicker
        const elapsed = Date.now() - splashStart;
        const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
        await new Promise((r) => setTimeout(r, remaining));

        bootDebug(debug, 'redirecting to', targetHref);
        router.replace(targetHref);
        return true;
      };

      const ceiling = new Promise<'timeout'>((resolve) => {
        ceilingId = setTimeout(() => resolve('timeout'), BOOT_HARD_CEILING_MS);
      });

      const result = await Promise.race([
        boot().then((ok): 'done' | 'redirected' => (ok ? 'done' : 'redirected')),
        ceiling,
      ]);

      if (result === 'timeout') {
        bootDebug(debug, 'hard ceiling triggered, redirecting to /?boot_timeout=1');
        router.replace('/?boot_timeout=1');
      } else {
        if (ceilingId != null) clearTimeout(ceilingId);
      }
    };

    run();
  }, [router, searchParams]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor }}
    >
      {/* Orbit branded splash */}
      <div className="flex flex-col items-center gap-8">
        <h1 className="font-light tracking-[0.2em] uppercase text-white/95 text-2xl sm:text-3xl">
          Orbit
        </h1>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
          aria-hidden
        />
      </div>
    </div>
  );
}
