'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AccountCreationStepProps {
  onboardingData: {
    userType: string | null;
    name: string | null;
    sex: 'Male' | 'Female' | null;
    birthYear: number | null;
    profilePicUrl: string | null;
  };
}

export default function AccountCreationStep({ onboardingData }: AccountCreationStepProps) {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);

    // Convert userType to uppercase to match database enum
    const userTypeUpper = onboardingData.userType?.toUpperCase();
    
    console.log('Signing up with data:', {
      email,
      userType: userTypeUpper,
      name: onboardingData.name,
      sex: onboardingData.sex,
      birthYear: onboardingData.birthYear,
    });

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userTypeUpper,
          name: onboardingData.name,
          sex: onboardingData.sex,
          birth_year: onboardingData.birthYear,
        },
      },
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData.user) {
      console.log('User created successfully:', signUpData.user.id);
      // Since we have email confirmations enabled, Supabase sends a confirmation link.
      // The user's profile is created via a trigger when they are added to auth.users.
      // We just need to inform them to check their email.
      alert('Sign up successful! Please check your email to confirm your account.');
      router.push('/login'); // Redirect to a login page after signup
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-[4rem] text-primary-blue">
        Create your account
      </h1>
      <p className="text-xl text-gray-600">
        Almost there! Just a few more details to get you started.
      </p>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
        />
        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <button
        onClick={handleSignUp}
        disabled={loading || !email || password.length < 6}
        className="rounded-full bg-primary-blue px-10 py-3 font-semibold text-white no-underline transition hover:bg-primary-blue-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Signing up...' : 'Complete Sign Up'}
      </button>
       {/* Placeholder for social logins, can be implemented later */}
    </div>
  );
} 