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

    // Convert userType to database enum values
    let userTypeUpper;
    if (onboardingData.userType === 'Sponsor') {
      userTypeUpper = 'MATCHMAKR';
    } else {
      userTypeUpper = onboardingData.userType?.toUpperCase();
    }
    
    const signUpPayload = {
      email,
      password,
      options: {
        data: {
          user_type: userTypeUpper,
          name: onboardingData.name,
          sex: onboardingData.sex,
          birth_year: onboardingData.birthYear,
          // Include additional fields that might be useful for future onboarding steps
          bio: null,
          occupation: null,
          city: null,
          state: null,
          zip_code: null,
          business_name: null,
          industry: null,
          offer: null,
          matchmakr_endorsement: null,
          location: null,
          sponsored_by_id: null,
          photos: [],
        },
      },
    };
    
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp(signUpPayload);
    
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData.user) {
      // The trigger function will automatically create the profile with correct user_type
      // Now we need to update the profile with the additional onboarding data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: onboardingData.name,
          sex: onboardingData.sex,
          birth_year: onboardingData.birthYear,
          // Add other fields as needed
        })
        .eq('id', signUpData.user.id);
      
      if (profileError) {
        console.error('Profile update error:', profileError);
        // Don't fail the signup if profile update fails - user can still log in
        // and complete their profile later
      }
      
      alert('Sign up successful! Please check your email to confirm your account.');
      router.push('/login'); // Redirect to a login page after signup
    }

    setLoading(false);
  };

  const isSingle = onboardingData.userType === 'Single';
  
  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="text-4xl font-light bg-gradient-primary bg-clip-text text-transparent leading-[1.1] tracking-tight sm:text-[4rem]">
        Create your account
      </h1>
      {isSingle ? (
        <>
          <p className="text-xl text-gray-600 font-light max-w-md">
            Your Sponsor will create your Orbit profile. You just need an account to get started.
          </p>
          <p className="text-lg text-gray-500 font-light max-w-md">
            Once you're signed up, your Sponsor can invite you and set up your profile for matching.
          </p>
        </>
      ) : (
        <p className="text-xl text-gray-600 font-light">
          Almost there! Just a few more details to get you started.
        </p>
      )}
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