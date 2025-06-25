'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (signInData.user) {
        // On successful login, fetch the user's profile to get their user_type
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', signInData.user.id)
            .single();

        if (profileError) {
            setError('Could not fetch user profile. Please try again.');
            setLoading(false);
            return;
        }

        if (profile) {
            const userType = profile.user_type.toLowerCase();
            router.push(`/dashboard/${userType}`);
        } else {
            // This case should ideally not happen if the trigger is working
            setError('No profile found for this user.');
            setLoading(false);
        }
    }
  };

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
            disabled={loading}
            className="rounded-full bg-gradient-primary px-10 py-3 font-light text-white no-underline transition-all duration-300 hover:bg-gradient-light hover:-translate-y-1 shadow-button hover:shadow-button-hover disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <a href="/" className="text-primary-blue underline mt-4 hover:text-primary-blue-light transition-colors font-light">
          Back to Home
        </a>
      </div>
    </main>
  );
} 