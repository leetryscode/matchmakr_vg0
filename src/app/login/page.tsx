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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-text-dark">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] text-text-dark leading-[1.1]">
          Login
        </h1>
        <form
          onSubmit={handleSignIn}
          className="flex flex-col gap-4 w-full max-w-md"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-white/20 bg-background-card px-4 py-3 text-text-dark placeholder:text-text-dark placeholder:opacity-80 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-white/20 bg-background-card px-4 py-3 text-text-dark placeholder:text-text-dark placeholder:opacity-80 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
          />
          {error && <p className="text-red-500 font-light">{error}</p>}
          <button
            type="submit"
            disabled={loadingSignIn}
            className="rounded-cta min-h-[48px] bg-action-entry text-primary-blue font-semibold shadow-cta-entry hover:bg-action-entry-hover active:bg-action-entry-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 px-10 py-3 text-base tracking-[0.02em] no-underline disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-entry"
          >
            {loadingSignIn ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <a href="/" className="text-text-dark no-underline mt-4 hover:text-white transition-colors font-light">
          Back
        </a>
      </div>
    </main>
  );
} 