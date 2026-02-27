'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { clearInviteMode } from '@/lib/invite-mode';

interface AccountCreationStepProps {
  onboardingData: {
    userType: string | null;
    name: string | null;
    sex: 'Male' | 'Female' | null;
    birthDate: string | null;
    openTo: 'men' | 'women' | 'both' | null;
    orbitCommunitySlug: string | null;
    profilePicUrl: string | null;
  };
  /** Prefill email from invite (editable) */
  initialEmail?: string | null;
}

export default function AccountCreationStep({ onboardingData, initialEmail = '' }: AccountCreationStepProps) {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? '');
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
          birth_date: onboardingData.birthDate ?? undefined,
          open_to: onboardingData.openTo ?? undefined,
          orbit_community_slug: onboardingData.orbitCommunitySlug ?? undefined,
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
      const updatePayload: Record<string, unknown> = {
        name: onboardingData.name,
        sex: onboardingData.sex,
      };
      if (onboardingData.birthDate) updatePayload.birth_date = onboardingData.birthDate;
      if (onboardingData.openTo) updatePayload.open_to = onboardingData.openTo;
      if (onboardingData.orbitCommunitySlug) updatePayload.orbit_community_slug = onboardingData.orbitCommunitySlug;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', signUpData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      if (signUpData.session) {
        clearInviteMode();
        const role = onboardingData.userType === 'Single' ? 'single' : 'matchmakr';
        router.push(`/dashboard/${role}`);
      } else {
        clearInviteMode();
        alert('Sign up successful! Please check your email to confirm your account.');
        router.push('/login');
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
        Create your account
      </h1>
      <p className="text-xl text-orbit-muted font-light">
        Almost there! No need to check your email after this step, you'll go straight to your dashboard.
      </p>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
        />
        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
        />
      </div>
      {error && <p className="text-red-500 font-light">{error}</p>}
      <button
        onClick={handleSignUp}
        disabled={loading || !email || password.length < 6}
        className="orbit-btn-primary min-h-[48px] px-10 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing up...' : 'Complete Sign Up'}
      </button>
       {/* Placeholder for social logins, can be implemented later */}
    </div>
  );
} 