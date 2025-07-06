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
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData.user) {
      // Update the user's profile with onboarding data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: userTypeUpper,
          name: onboardingData.name,
          sex: onboardingData.sex,
          birth_year: onboardingData.birthYear,
          // Add other fields as needed
        })
        .eq('id', signUpData.user.id);
      if (profileError) {
        setError('Error saving profile data. Please try again.');
        setLoading(false);
        return;
      }
      alert('Sign up successful! Please check your email to confirm your account.');
      router.push('/login'); // Redirect to a login page after signup
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="text-4xl font-light gradient-text leading-[1.1] tracking-tight sm:text-[4rem]">
        Create your account
      </h1>
      <p className="text-xl text-gray-600 font-light">
        Almost there! Just a few more details to get you started.
      </p>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
        />
        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
        />
      </div>
      {error && <p className="text-red-500 font-light">{error}</p>}
      <button
        onClick={handleSignUp}
        disabled={loading || !email || password.length < 6}
        className="rounded-full bg-gradient-primary px-10 py-3 font-light text-white no-underline transition-all duration-300 hover:bg-gradient-light hover:-translate-y-1 shadow-button hover:shadow-button-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none"
      >
        {loading ? 'Signing up...' : 'Complete Sign Up'}
      </button>
       {/* Placeholder for social logins, can be implemented later */}
    </div>
  );
} 