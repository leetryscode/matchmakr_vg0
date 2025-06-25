'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VendorOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [vendorData, setVendorData] = useState({
    businessName: '',
    industry: '',
    location: '',
    images: [],
    offer: '',
  });

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };
  
  const handleComplete = () => {
    console.log("Vendor data:", vendorData);
    alert("Vendor onboarding complete!");
    router.push('/vendor-dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-gray-800">
       <div className="absolute top-4 left-4">
        <button onClick={handleBack} className="text-primary-blue underline hover:text-primary-blue-light transition-colors font-light">
          Back
        </button>
      </div>
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
        {step === 1 && (
          <div className="flex flex-col items-center justify-center gap-8">
            <h1 className="text-4xl font-light gradient-text leading-[1.1] tracking-tight sm:text-[4rem]">
              Tell us about your business
            </h1>
            <input
              type="text"
              value={vendorData.businessName}
              onChange={(e) => setVendorData({ ...vendorData, businessName: e.target.value })}
              placeholder="Business Name"
              className="w-full max-w-md rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
            />
            <input
              type="text"
              value={vendorData.industry}
              onChange={(e) => setVendorData({ ...vendorData, industry: e.target.value })}
              placeholder="Industry (e.g., Restaurant, Bar, Cafe)"
              className="w-full max-w-md rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
            />
            <input
              type="text"
              value={vendorData.location}
              onChange={(e) => setVendorData({ ...vendorData, location: e.target.value })}
              placeholder="Location (e.g., Address or City)"
              className="w-full max-w-md rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
            />
            <button
              onClick={handleNext}
              disabled={!vendorData.businessName || !vendorData.industry || !vendorData.location}
              className="rounded-full bg-gradient-primary px-10 py-3 font-light text-white no-underline transition-all duration-300 hover:bg-gradient-light hover:-translate-y-1 shadow-button hover:shadow-button-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none"
            >
              Next
            </button>
          </div>
        )}
        {step === 2 && (
            <div className="flex flex-col items-center justify-center gap-8">
                <h1 className="text-4xl font-light gradient-text leading-[1.1] tracking-tight sm:text-[4rem]">Upload Images</h1>
                <div className="flex h-48 w-full max-w-md items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-100 shadow-card">
                    <p className="text-gray-500 font-light">Placeholder for image upload</p>
                </div>
                 <button
                    onClick={handleNext}
                    className="rounded-full bg-gradient-primary px-10 py-3 font-light text-white no-underline transition-all duration-300 hover:bg-gradient-light hover:-translate-y-1 shadow-button hover:shadow-button-hover"
                >
                    Next (Skip for now)
                </button>
            </div>
        )}
         {step === 3 && (
            <div className="flex flex-col items-center justify-center gap-8">
                <h1 className="text-4xl font-light gradient-text leading-[1.1] tracking-tight sm:text-[4rem]">Create an Offer</h1>
                <textarea
                    value={vendorData.offer}
                    onChange={(e) => setVendorData({ ...vendorData, offer: e.target.value })}
                    placeholder="e.g., 20% off drinks, free appetizer"
                    className="w-full max-w-md rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
                    rows={4}
                />
                 <button
                    onClick={handleComplete}
                    disabled={!vendorData.offer}
                    className="rounded-full bg-gradient-primary px-10 py-3 font-light text-white no-underline transition-all duration-300 hover:bg-gradient-light hover:-translate-y-1 shadow-button hover:shadow-button-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none"
                >
                    Complete Onboarding
                </button>
            </div>
        )}
      </div>
    </main>
  );
} 