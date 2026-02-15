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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    userType: null as string | null,
    name: null as string | null,
    sex: null as 'Male' | 'Female' | null,
    birthDate: null as string | null,
    openTo: null as 'men' | 'women' | 'both' | null,
    orbitCommunitySlug: null as string | null,
    profilePicUrl: null as string | null,
  });

  const handleUserTypeSelect = (type: string) => {
    setOnboardingData({ ...onboardingData, userType: type });
    if (type === 'Vendor') {
      // Handle Vendor flow separately if needed
      // For now, let's assume it follows a different path
      router.push('/onboarding/vendor'); // Example redirect
    } else if (type === 'Single') {
      // Singles skip detailed profile building - their Sponsor will create their profile
      // Just collect minimal info (name, sex, age) for account creation
      setStep(2);
    } else {
      // Sponsors go through full profile building
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
            <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] text-text-dark leading-[1.1]">
              Select User Type
            </h1>
            <div className={`grid grid-cols-1 gap-4 ${orbitConfig.enableVendors ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} md:gap-8`}>
              <button
                onClick={() => handleUserTypeSelect('Single')}
                className="flex max-w-xs flex-col gap-4 rounded-xl bg-background-card p-6 text-text-dark card-hover-subtle shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-200"
              >
                <h3 className="text-2xl font-light text-text-dark">Single →</h3>
                <div className="text-lg font-light">
                  I'm open to being introduced.
                </div>
              </button>
              <button
                onClick={() => handleUserTypeSelect('Sponsor')}
                className="flex max-w-xs flex-col gap-4 rounded-xl bg-background-card p-6 text-text-dark card-hover-subtle shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-200"
              >
                <h3 className="text-2xl font-light text-text-dark">Sponsor →</h3>
                <div className="text-lg font-light">
                  I want to introduce my friends.
                </div>
              </button>
              {orbitConfig.enableVendors && (
                <button
                  onClick={() => handleUserTypeSelect('Vendor')}
                  className="flex max-w-xs flex-col gap-4 rounded-xl bg-background-card p-6 text-text-dark card-hover-subtle shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-200"
                >
                  <h3 className="text-2xl font-light text-text-dark">Vendor →</h3>
                  <div className="text-lg font-light">
                    I want to promote my business for dates.
                  </div>
                </button>
              )}
            </div>
          </>
        );
      case 2:
        return <NameStep onNext={(name) => { setOnboardingData({ ...onboardingData, name }); setStep(3); }} />;
      case 3:
        return <BirthdayStep onNext={(birthDate) => { setOnboardingData({ ...onboardingData, birthDate }); setStep(4); }} onTooYoung={handleTooYoung} />;
      case 4:
        return <SexStep onNext={(sex) => { setOnboardingData({ ...onboardingData, sex }); setStep(5); }} />;
      case 5:
        if (onboardingData.userType === 'Sponsor') {
          return <CommunityStep variant="sponsor" onNext={(orbitCommunitySlug) => { setOnboardingData({ ...onboardingData, orbitCommunitySlug }); setStep(6); }} />;
        }
        return <OpenToStep onNext={(openTo) => { setOnboardingData({ ...onboardingData, openTo }); setStep(6); }} />;
      case 6:
        if (onboardingData.userType === 'Sponsor') {
          return <AccountCreationStep onboardingData={onboardingData} />;
        }
        return <CommunityStep variant="single" onNext={(orbitCommunitySlug) => { setOnboardingData({ ...onboardingData, orbitCommunitySlug }); setStep(7); }} />;
      case 7:
        return <AccountCreationStep onboardingData={onboardingData} />;
      default:
        return <div>Unknown step</div>;
    }
  };
  
  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.push('/');
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-text-dark">
       <div className="absolute top-4 left-4">
        <button onClick={goBack} className="text-text-dark underline hover:text-white transition-colors font-light">
          {step > 1 ? 'Back' : 'Home'}
        </button>
      </div>
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
        {renderStep()}
      </div>
    </main>
  );
} 