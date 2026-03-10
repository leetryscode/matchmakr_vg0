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

  const showCommunityStep =
    onboardingData.userType === 'Sponsor' ||
    (onboardingData.userType === 'Single' && inviteMode !== null);

  const handleUserTypeSelect = (type: string) => {
    setOnboardingData({ ...onboardingData, userType: type });
    if (type === 'Vendor') {
      router.push('/onboarding/vendor');
    } else {
      setStep(2);
    }
  };

  const handleTooYoung = () => {
    alert('You must be 18 or older to join.');
    router.push('/');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] text-orbit-text leading-[1.1]">
              Select User Type
            </h1>
            <div className={`grid grid-cols-1 gap-4 ${orbitConfig.enableVendors ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} md:gap-8`}>
              <button
                onClick={() => handleUserTypeSelect('Single')}
                className="orbit-ring flex max-w-xs flex-col gap-4 rounded-card-lg orbit-card p-6 text-orbit-text card-hover-subtle transition-all duration-300 hover:-translate-y-1"
              >
                <h3 className="text-2xl font-light text-orbit-text">Single →</h3>
                <div className="text-lg font-light text-orbit-text2">
                  I'm open to being introduced.
                </div>
              </button>
              <button
                onClick={() => handleUserTypeSelect('Sponsor')}
                className="orbit-ring flex max-w-xs flex-col gap-4 rounded-card-lg orbit-card p-6 text-orbit-text card-hover-subtle transition-all duration-300 hover:-translate-y-1"
              >
                <h3 className="text-2xl font-light text-orbit-text">Sponsor →</h3>
                <div className="text-lg font-light text-orbit-text2">
                  I want to introduce my friends.
                </div>
              </button>
              {orbitConfig.enableVendors && (
                <button
                  onClick={() => handleUserTypeSelect('Vendor')}
                  className="orbit-ring flex max-w-xs flex-col gap-4 rounded-card-lg orbit-card p-6 text-orbit-text card-hover-subtle transition-all duration-300 hover:-translate-y-1"
                >
                  <h3 className="text-2xl font-light text-orbit-text">Vendor →</h3>
                  <div className="text-lg font-light text-orbit-text2">
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
            onNext={(name) => { setOnboardingData({ ...onboardingData, name }); setStep(3); }}
            initialValue={onboardingData.name ?? undefined}
          />
        );
      case 3:
        return <BirthdayStep onNext={(birthDate) => { setOnboardingData({ ...onboardingData, birthDate }); setStep(4); }} onTooYoung={handleTooYoung} />;
      case 4:
        return <SexStep onNext={(sex) => { setOnboardingData({ ...onboardingData, sex }); setStep(5); }} />;
      case 5:
        if (onboardingData.userType === 'Sponsor') {
          return (
            <CommunityStep
              variant="sponsor"
              onNext={(communityIntent) => {
                setOnboardingData({ ...onboardingData, communityIntent });
                setStep(6);
              }}
            />
          );
        }
        return (
          <OpenToStep
            onNext={(openTo) => {
              setOnboardingData({ ...onboardingData, openTo });
              setStep(showCommunityStep ? 6 : 7);
            }}
          />
        );
      case 6:
        if (onboardingData.userType === 'Sponsor') {
          return (
            <AccountCreationStep
              onboardingData={onboardingData}
              communityIntent={onboardingData.communityIntent}
              initialEmail={inviteMode?.prefillEmail}
            />
          );
        }
        return (
          <CommunityStep
            variant="single"
            onNext={(communityIntent) => {
              setOnboardingData({ ...onboardingData, communityIntent });
              setStep(7);
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
    if (step > 2) {
      if (step === 7 && !showCommunityStep) {
        setStep(5);
      } else {
        setStep(step - 1);
      }
    } else if (inviteMode && step === 2) {
      router.push(`/invite/${inviteMode.inviteToken}`);
    } else if (step === 1) {
      router.push('/');
    } else {
      setStep(1);
    }
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-transparent text-orbit-text p-4">
       <div className="absolute top-4 left-4">
        <button onClick={goBack} className="orbit-btn-ghost text-orbit-text2 hover:text-orbit-text underline font-light">
          {step > 1 ? 'Back' : 'Home'}
        </button>
      </div>
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
        {renderStep()}
      </div>
    </main>
  );
} 