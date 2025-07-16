'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import NameStep from '@/components/onboarding/NameStep';
import SexStep from '@/components/onboarding/SexStep';
import AgeStep from '@/components/onboarding/AgeStep';
import AccountCreationStep from '@/components/onboarding/AccountCreationStep';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    userType: null as string | null,
    name: null as string | null,
    sex: null as 'Male' | 'Female' | null,
    birthYear: null as number | null,
    profilePicUrl: null as string | null,
  });

  const handleUserTypeSelect = (type: string) => {
    setOnboardingData({ ...onboardingData, userType: type });
    if (type === 'Vendor') {
      // Handle Vendor flow separately if needed
      // For now, let's assume it follows a different path
      router.push('/onboarding/vendor'); // Example redirect
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
            <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] gradient-text leading-[1.1]">
              Select User Type
            </h1>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-8">
              <button
                onClick={() => handleUserTypeSelect('Single')}
                className="flex max-w-xs flex-col gap-4 rounded-xl bg-background-card p-6 text-gray-800 hover:bg-gray-50 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-200"
              >
                <h3 className="text-2xl font-light gradient-text">Single →</h3>
                <div className="text-lg font-light">
                  I'm a single looking for a match.
                </div>
              </button>
              <button
                onClick={() => handleUserTypeSelect('MATCHMAKR')}
                className="flex max-w-xs flex-col gap-4 rounded-xl bg-background-card p-6 text-gray-800 hover:bg-gray-50 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-200"
              >
                <h3 className="text-2xl font-light gradient-text">Sponsor →</h3>
                <div className="text-lg font-light">
                  I want to find matches for my friends.
                </div>
              </button>
              <button
                onClick={() => handleUserTypeSelect('Vendor')}
                className="flex max-w-xs flex-col gap-4 rounded-xl bg-background-card p-6 text-gray-800 hover:bg-gray-50 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-200"
              >
                <h3 className="text-2xl font-light gradient-text">Vendor →</h3>
                <div className="text-lg font-light">
                  I want to promote my business for dates.
                </div>
              </button>
            </div>
          </>
        );
      case 2:
        return <NameStep onNext={(name) => { setOnboardingData({ ...onboardingData, name }); setStep(3); }} />;
      case 3:
        return <SexStep onNext={(sex) => { setOnboardingData({ ...onboardingData, sex }); setStep(4); }} />;
      case 4:
        return <AgeStep onNext={(birthYear) => { setOnboardingData({ ...onboardingData, birthYear }); setStep(5); }} onTooYoung={handleTooYoung} />;
      case 5:
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-gray-800">
       <div className="absolute top-4 left-4">
        <button onClick={goBack} className="text-primary-blue underline hover:text-primary-blue-light transition-colors font-light">
          {step > 1 ? 'Back' : 'Home'}
        </button>
      </div>
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
        {renderStep()}
      </div>
    </main>
  );
} 