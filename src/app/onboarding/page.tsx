'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import NameStep from '@/components/onboarding/NameStep';
import SexStep from '@/components/onboarding/SexStep';
import BirthdayStep from '@/components/onboarding/BirthdayStep';
import OpenToStep from '@/components/onboarding/OpenToStep';
import CommunityStep from '@/components/onboarding/CommunityStep';
import AccountCreationStep from '@/components/onboarding/AccountCreationStep';
import { orbitConfig } from '@/config/orbitConfig';
import { getInviteMode, type InviteMode } from '@/lib/invite-mode';

type CommunityIntent = { communityId: string } | null;
type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const initialOnboardingData = {
  userType: null as string | null,
  name: null as string | null,
  sex: null as 'Male' | 'Female' | null,
  birthDate: null as string | null,
  openTo: null as 'men' | 'women' | 'both' | null,
  communityIntent: null as CommunityIntent,
  profilePicUrl: null as string | null,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [inviteMode] = useState<InviteMode | null>(() =>
    typeof window !== 'undefined' ? getInviteMode() : null
  );
  const [step, setStep] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const mode = getInviteMode();
    return mode ? 2 : 1;
  });
  const [onboardingData, setOnboardingData] = useState(() => {
    if (typeof window === 'undefined') return initialOnboardingData;
    const mode = getInviteMode();
    if (!mode) return initialOnboardingData;
    const uiRole = mode.lockedRole === 'SPONSOR' ? 'Sponsor' : 'Single';
    return {
      ...initialOnboardingData,
      userType: uiRole,
      name: mode.prefillName,
    };
  });
  const [underageBlocked, setUnderageBlocked] = useState(false);

  const hasInviteCommunity = inviteMode !== null && inviteMode.prefillCommunityId !== null;
  const isSingle = onboardingData.userType === 'Single';

  const visibleSteps: OnboardingStep[] = [
    ...(inviteMode ? [] : [1 as const]),
    2,
    ...(isSingle ? ([3, 4] as const) : []),
    ...(hasInviteCommunity ? ([5] as const) : []),
    ...(isSingle ? ([6] as const) : []),
    7,
  ];

  const getNextVisibleStep = (currentStep: OnboardingStep): OnboardingStep | null => {
    const idx = visibleSteps.indexOf(currentStep);
    if (idx === -1 || idx >= visibleSteps.length - 1) return null;
    return visibleSteps[idx + 1];
  };

  const getPreviousVisibleStep = (currentStep: OnboardingStep): OnboardingStep | null => {
    const idx = visibleSteps.indexOf(currentStep);
    if (idx <= 0) return null;
    return visibleSteps[idx - 1];
  };

  const handleUserTypeSelect = (type: string) => {
    setOnboardingData({ ...onboardingData, userType: type });
    if (type === 'Vendor') {
      router.push('/onboarding/vendor');
    } else {
      setStep(2);
    }
  };

  const handleTooYoung = () => {
    setUnderageBlocked(true);
  };

  const renderStep = () => {
    if (underageBlocked) {
      return (
        <div className="onboarding-step-shell">
          <div className="onboarding-step-content">
            <h1 className="onboarding-heading text-3xl leading-[1.1] tracking-tight sm:text-5xl">
            You must be 18 or older to use Orbit.
            </h1>
          </div>
          <div className="onboarding-step-actions">
            <button
              onClick={() => router.push('/')}
              className="onboarding-btn-primary"
            >
              Return to welcome
            </button>
          </div>
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <>
            <h1 className="onboarding-heading text-4xl font-light tracking-tight sm:text-6xl leading-[1.1]">
              How will you use Orbit?
            </h1>
            <div className={`mt-8 grid w-full max-w-3xl grid-cols-1 gap-4 ${orbitConfig.enableVendors ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} md:gap-6`}>
              <button
                onClick={() => handleUserTypeSelect('Single')}
                className="onboarding-selection flex min-h-[120px] flex-col justify-center gap-2 text-left transition-colors"
              >
                <h3 className="onboarding-heading text-2xl font-medium">Single</h3>
                <div className="onboarding-muted text-base">
                  I'm looking to meet someone
                </div>
              </button>
              <button
                onClick={() => handleUserTypeSelect('Sponsor')}
                className="onboarding-selection flex min-h-[120px] flex-col justify-center gap-2 text-left transition-colors"
              >
                <h3 className="onboarding-heading text-2xl font-medium">Sponsor</h3>
                <div className="onboarding-muted text-base">
                  I want to introduce my friends
                </div>
              </button>
              {orbitConfig.enableVendors && (
                <button
                  onClick={() => handleUserTypeSelect('Vendor')}
                  className="onboarding-selection flex min-h-[120px] flex-col justify-center gap-2 text-left transition-colors"
                >
                  <h3 className="onboarding-heading text-2xl font-medium">Vendor</h3>
                  <div className="onboarding-muted text-base">
                    I want to promote my business for dates.
                  </div>
                </button>
              )}
            </div>
          </>
        );
      case 2:
        return (
          <NameStep
            onNext={(name) => {
              setOnboardingData({ ...onboardingData, name });
              const nextStep = getNextVisibleStep(2);
              if (nextStep) setStep(nextStep);
            }}
            initialValue={onboardingData.name ?? undefined}
          />
        );
      case 3:
        return (
          <BirthdayStep
            onNext={(birthDate) => {
              setOnboardingData({ ...onboardingData, birthDate });
              const nextStep = getNextVisibleStep(3);
              if (nextStep) setStep(nextStep);
            }}
            onTooYoung={handleTooYoung}
          />
        );
      case 4:
        return (
          <SexStep
            onNext={(sex) => {
              setOnboardingData({ ...onboardingData, sex });
              const nextStep = getNextVisibleStep(4);
              if (nextStep) setStep(nextStep);
            }}
          />
        );
      case 5:
        return (
          <CommunityStep
            variant={onboardingData.userType === 'Sponsor' ? 'sponsor' : 'single'}
            prefillCommunityId={inviteMode?.prefillCommunityId ?? undefined}
            prefillCommunityName={inviteMode?.prefillCommunityName ?? undefined}
            onNext={(communityIntent) => {
              setOnboardingData({ ...onboardingData, communityIntent });
              const nextStep = getNextVisibleStep(5);
              if (nextStep) setStep(nextStep);
            }}
          />
        );
      case 6:
        return (
          <OpenToStep
            onNext={(openTo) => {
              setOnboardingData({ ...onboardingData, openTo });
              const nextStep = getNextVisibleStep(6);
              if (nextStep) setStep(nextStep);
            }}
          />
        );
      case 7:
        return (
          <AccountCreationStep
            onboardingData={onboardingData}
            communityIntent={onboardingData.communityIntent}
            initialEmail={inviteMode?.prefillEmail}
          />
        );
      default:
        return <div>Unknown step</div>;
    }
  };
  
  const goBack = () => {
    if (inviteMode && step === 2) {
      router.push(`/invite/${inviteMode.inviteToken}`);
      return;
    }

    const previousStep = getPreviousVisibleStep(step as OnboardingStep);
    if (previousStep) {
      setStep(previousStep);
      return;
    }

    if (step === 1) {
      router.push('/');
      return;
    }

    setStep(1);
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-transparent p-4">
       <div className="absolute top-4 left-4">
        <button onClick={goBack} className="onboarding-back-chevron" aria-label="Back">
          &#8249;
        </button>
      </div>
      <div className="container flex w-full flex-col items-center justify-center px-4 py-16">
        {renderStep()}
      </div>
    </main>
  );
} 