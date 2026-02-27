'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingSignIn, setLoadingSignIn] = useState(false);

  // Don't check for cached users or redirect - just show the login form
  // The AuthContext will handle redirects after successful sign-in

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSignIn(true);
    setError(null);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoadingSignIn(false);
      return;
    }

    if (signInData.user) {
      // The auth context will handle the redirect
      // Reset loading state - if redirect fails, user can see the form
      setLoadingSignIn(false);
      console.log('[LoginPage] Sign-in successful, waiting for AuthContext redirect');
    } else {
      // No user returned - shouldn't happen but handle it
      setLoadingSignIn(false);
      setError('Sign in completed but no user data returned');
    }
  };

  // Always show the login form - no redirects, no cached user checks

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-transparent text-orbit-text p-4">
      <div className="flex flex-col items-center justify-center gap-6 w-full max-w-md">
        <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] text-orbit-text leading-[1.1]">
          Login
        </h1>
        <div className="orbit-surface-strong rounded-card-lg shadow-card px-6 py-6 w-full">
          <form
            onSubmit={handleSignIn}
            className="flex flex-col gap-4"
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
            />
            {error && <p className="text-red-500 font-light">{error}</p>}
            <button
              type="submit"
              disabled={loadingSignIn}
              className="orbit-btn-primary min-h-[48px] px-10 py-3 text-base tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingSignIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        <a href="/" className="orbit-btn-ghost text-orbit-text2 hover:text-orbit-text no-underline mt-2 font-light">
          Back
        </a>
      </div>
    </main>
  );
} 