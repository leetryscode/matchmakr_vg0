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
    <div className="onboarding-step-shell">
      <div className="onboarding-step-content">
        <h1 className="onboarding-heading text-3xl leading-[1.1] tracking-tight sm:text-5xl">
          Create your account
        </h1>
        <p className="onboarding-muted text-base sm:text-lg">
          Last step — you'll go straight to your dashboard after this.
        </p>
        <div className="flex w-full max-w-md flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="onboarding-input"
          />
          <input
            type="password"
            placeholder="Password (at least 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="onboarding-input"
          />
        </div>
        <div className="w-full max-w-md rounded-xl border border-white/15 bg-white/5 p-4 text-left">
          <label className="onboarding-muted flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(e) => setAcceptedLegal(e.target.checked)}
              className="onboarding-checkbox mt-0.5"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="onboarding-link">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="onboarding-link">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {isSponsor && (
            <label className="onboarding-muted mt-3 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={confirmedSponsorAge}
                onChange={(e) => setConfirmedSponsorAge(e.target.checked)}
                className="onboarding-checkbox mt-0.5"
              />
              <span>I confirm I am 18 years of age or older.</span>
            </label>
          )}
        </div>
        {error && <p className="onboarding-muted text-sm">{error}</p>}
        {consentWarning && (
          <div className="onboarding-warning-box w-full max-w-md rounded-xl p-4 text-left">
            <p className="onboarding-muted text-sm text-white/75">{consentWarning}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={handleRetryConsent}
                disabled={loading}
                className="onboarding-btn-primary min-h-[40px] px-6 py-2 text-sm"
              >
                Retry
              </button>
              <button
                onClick={handleContinueAnyway}
                disabled={loading}
                className="onboarding-btn-ghost"
              >
                Continue anyway
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="onboarding-step-actions">
        <button
          onClick={handleSignUp}
          disabled={!canSubmit}
          className="onboarding-btn-primary"
        >
          {loading ? 'Signing up...' : 'Create Account'}
        </button>
      </div>
      {/* Placeholder for social logins, can be implemented later */}
    </div>
  );
} 