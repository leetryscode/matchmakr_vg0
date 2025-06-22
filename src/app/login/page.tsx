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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
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
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-pink-400 focus:outline-none focus:ring-pink-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-pink-400 focus:outline-none focus:ring-pink-400"
          />
          {error && <p className="text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-pink-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-pink-600 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <a href="/" className="text-pink-400 underline mt-4">
          Back to Home
        </a>
      </div>
    </main>
  );
} 