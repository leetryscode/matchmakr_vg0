'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type View = 'login' | 'forgot' | 'forgot-sent';

export default function LoginPage() {
  const supabase = createClient();
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

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
      setLoadingSignIn(false);
      console.log('[LoginPage] Sign-in successful, waiting for AuthContext redirect');
    } else {
      setLoadingSignIn(false);
      setError('Sign in completed but no user data returned');
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingReset(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://orbitintroductions.app/auth/reset-password',
    });

    setLoadingReset(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setView('forgot-sent');
  };

  const inputClass = "orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light";

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-transparent text-orbit-text p-4">
      <div className="flex flex-col items-center justify-center gap-6 w-full max-w-md">

        {view === 'login' && (
          <>
            <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] text-orbit-text leading-[1.1]">
              Login
            </h1>
            <div className="orbit-surface-strong rounded-card-lg shadow-card px-6 py-6 w-full">
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClass}
                />
                {error && <p className="text-orbit-warning font-light">{error}</p>}
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
            <button
              type="button"
              onClick={() => { setError(null); setView('forgot'); }}
              className="text-xs text-orbit-muted hover:text-orbit-text2 font-light transition-colors"
            >
              Forgot password?
            </button>
          </>
        )}

        {view === 'forgot' && (
          <>
            <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] text-orbit-text leading-[1.1]">
              Reset
            </h1>
            <div className="orbit-surface-strong rounded-card-lg shadow-card px-6 py-6 w-full">
              <p className="text-orbit-muted font-light text-sm mb-4">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
              <form onSubmit={handleResetRequest} className="flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className={inputClass}
                />
                {error && <p className="text-orbit-warning font-light">{error}</p>}
                <button
                  type="submit"
                  disabled={loadingReset}
                  className="orbit-btn-primary min-h-[48px] px-10 py-3 text-base tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingReset ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </div>
            <button
              onClick={() => { setError(null); setView('login'); }}
              className="orbit-btn-ghost text-orbit-text2 hover:text-orbit-text mt-2 font-light"
            >
              Back to sign in
            </button>
          </>
        )}

        {view === 'forgot-sent' && (
          <>
            <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] text-orbit-text leading-[1.1]">
              Check email
            </h1>
            <div className="orbit-surface-strong rounded-card-lg shadow-card px-6 py-6 w-full flex flex-col gap-4">
              <p className="text-orbit-gold font-light">
                A reset link is on its way to {resetEmail}.
              </p>
              <p className="text-orbit-muted font-light text-sm">
                Click the link in the email to set a new password. It may take a minute or two to arrive.
              </p>
            </div>
            <button
              onClick={() => { setError(null); setView('login'); }}
              className="orbit-btn-ghost text-orbit-text2 hover:text-orbit-text mt-2 font-light"
            >
              Back to sign in
            </button>
          </>
        )}

      </div>
    </main>
  );
} 