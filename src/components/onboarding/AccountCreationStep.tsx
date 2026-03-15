'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { clearInviteMode, getInviteMode } from '@/lib/invite-mode';
import Link from 'next/link';

type CommunityIntent = { communityId: string } | null;

interface AccountCreationStepProps {
  onboardingData: {
    userType: string | null;
    name: string | null;
    sex: 'Male' | 'Female' | null;
    birthDate: string | null;
    openTo: 'men' | 'women' | 'both' | null;
    profilePicUrl: string | null;
  };
  /** Intent to join a community after signup; join is attempted only if session exists */
  communityIntent?: CommunityIntent;
  /** Prefill email from invite (editable) */
  initialEmail?: string | null;
}

type PendingConsent = {
  userId: string;
  ageConfirmed: boolean;
  hasSession: boolean;
};

export default function AccountCreationStep({ onboardingData, communityIntent = null, initialEmail = '' }: AccountCreationStepProps) {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [confirmedSponsorAge, setConfirmedSponsorAge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentWarning, setConsentWarning] = useState<string | null>(null);
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(null);
  const [loading, setLoading] = useState(false);
  const isSponsor = onboardingData.userType === 'Sponsor';

  const computeIs18OrOlder = (isoBirthDate: string | null): boolean => {
    if (!isoBirthDate) return false;
    const birth = new Date(isoBirthDate);
    if (Number.isNaN(birth.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age >= 18;
  };

  const insertTosAcceptance = async (userId: string, ageConfirmed: boolean): Promise<boolean> => {
    const { error: tosError } = await supabase.from('tos_acceptances').insert({
      user_id: userId,
      tos_version: '1.0',
      privacy_policy_version: '1.0',
      age_confirmed: ageConfirmed,
      ip_address: null,
    });

    if (tosError) {
      console.error('tos_acceptances insert error:', tosError);
      return false;
    }
    return true;
  };

  const finalizePostSignup = async (hasSession: boolean) => {
    if (communityIntent && hasSession) {
      try {
        const inviteMode = getInviteMode();
        const body: { inviteToken?: string } = {};
        if (inviteMode?.inviteToken) body.inviteToken = inviteMode.inviteToken;

        const joinRes = await fetch(`/api/communities/${communityIntent.communityId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!joinRes.ok) {
          const errData = await joinRes.json().catch(() => ({}));
          console.warn('[AccountCreationStep] Community join failed:', joinRes.status, errData);
        }
      } catch (joinErr) {
        console.warn('[AccountCreationStep] Community join error:', joinErr);
      }
    }

    if (hasSession) {
      clearInviteMode();
      const role = onboardingData.userType === 'Single' ? 'single' : 'matchmakr';
      router.push(`/dashboard/${role}`);
    } else {
      clearInviteMode();
      alert('Sign up successful! Please check your email to confirm your account.');
      router.push('/login');
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    setConsentWarning(null);
    setPendingConsent(null);

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

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', signUpData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      const ageConfirmed =
        isSponsor ? confirmedSponsorAge : computeIs18OrOlder(onboardingData.birthDate);
      const consentSaved = await insertTosAcceptance(signUpData.user.id, ageConfirmed);
      if (!consentSaved) {
        setConsentWarning("Account created, but we couldn't save your consent record.");
        setPendingConsent({
          userId: signUpData.user.id,
          ageConfirmed,
          hasSession: !!signUpData.session,
        });
        setLoading(false);
        return;
      }

      await finalizePostSignup(!!signUpData.session);
    }

    setLoading(false);
  };

  const handleRetryConsent = async () => {
    if (!pendingConsent) return;
    setLoading(true);
    setConsentWarning(null);
    const saved = await insertTosAcceptance(pendingConsent.userId, pendingConsent.ageConfirmed);
    if (!saved) {
      setConsentWarning("Account created, but we couldn't save your consent record.");
      setLoading(false);
      return;
    }

    const hasSession = pendingConsent.hasSession;
    setPendingConsent(null);
    await finalizePostSignup(hasSession);
    setLoading(false);
  };

  const handleContinueAnyway = async () => {
    if (!pendingConsent) return;
    setLoading(true);
    const hasSession = pendingConsent.hasSession;
    setPendingConsent(null);
    setConsentWarning(null);
    await finalizePostSignup(hasSession);
    setLoading(false);
  };

  const canSubmit =
    !loading &&
    !pendingConsent &&
    !!email &&
    password.length >= 6 &&
    acceptedLegal &&
    (!isSponsor || confirmedSponsorAge);

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
      <div className="flex w-full max-w-md flex-col gap-3 rounded-card-lg border border-orbit-border/50 bg-orbit-surface/60 p-4 text-left">
        <label className="flex items-start gap-3 text-sm font-light text-orbit-text">
          <input
            type="checkbox"
            checked={acceptedLegal}
            onChange={(e) => setAcceptedLegal(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-orbit-border/70 bg-orbit-surface/80 text-orbit-gold focus:ring-orbit-gold"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-orbit-gold underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-orbit-gold underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {isSponsor && (
          <label className="flex items-start gap-3 text-sm font-light text-orbit-text">
            <input
              type="checkbox"
              checked={confirmedSponsorAge}
              onChange={(e) => setConfirmedSponsorAge(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-orbit-border/70 bg-orbit-surface/80 text-orbit-gold focus:ring-orbit-gold"
            />
            <span>I confirm I am 18 years of age or older.</span>
          </label>
        )}
      </div>
      {error && <p className="text-red-500 font-light">{error}</p>}
      {consentWarning && (
        <div className="flex w-full max-w-md flex-col gap-3 rounded-card-lg border border-orbit-warning/45 bg-orbit-warning/24 p-4 text-left">
          <p className="text-sm font-light text-orbit-text">{consentWarning}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRetryConsent}
              disabled={loading}
              className="orbit-btn-primary min-h-[40px] px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Retry
            </button>
            <button
              onClick={handleContinueAnyway}
              disabled={loading}
              className="orbit-btn-ghost text-orbit-text2 underline font-light hover:text-orbit-text disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue anyway
            </button>
          </div>
        </div>
      )}
      <button
        onClick={handleSignUp}
        disabled={!canSubmit}
        className="orbit-btn-primary min-h-[48px] px-10 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing up...' : 'Complete Sign Up'}
      </button>
       {/* Placeholder for social logins, can be implemented later */}
    </div>
  );
} 