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

  // Redirect if already logged in
  useEffect(() => {
    console.log('AuthContext user:', user, 'loading:', loading);
    if (!loading && user) {
      // User is already logged in, redirect to appropriate dashboard
      const redirectToDashboard = async () => {
        try {
          console.log('Attempting profile fetch for user.id:', user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
          console.log('Fetched profile:', profile, 'error:', profileError);
          if (profile?.user_type) {
            router.push(`/dashboard/${profile.user_type.toLowerCase()}`);
          } else {
            router.push('/');
          }
        } catch (err) {
          console.error('Error in redirectToDashboard:', err);
        }
      };
      redirectToDashboard();
    }
  }, [user, loading, router, supabase]);

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
      setLoadingSignIn(false);
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-gray-800">
        <div className="text-lg">Loading...</div>
      </main>
    );
  }

  // Don't show login form if user is already logged in
  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-gray-800">
        <div className="text-lg">Redirecting...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-gray-800">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] gradient-text leading-[1.1]">
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
            className="w-full rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
          />
          {error && <p className="text-red-500 font-light">{error}</p>}
          <button
            type="submit"
            disabled={loadingSignIn}
            className="rounded-full bg-gradient-primary px-10 py-3 font-light text-white no-underline transition-all duration-300 hover:bg-gradient-light hover:-translate-y-1 shadow-button hover:shadow-button-hover disabled:opacity-50"
          >
            {loadingSignIn ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <a href="/" className="text-primary-blue underline mt-4 hover:text-primary-blue-light transition-colors font-light">
          Back
        </a>
      </div>
    </main>
  );
} 