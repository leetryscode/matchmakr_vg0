'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function VendorOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [vendorData, setVendorData] = useState({
    businessName: '',
    industry: '',
    streetAddress: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };
  
  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    // Validate all required fields
    if (!vendorData.businessName || !vendorData.industry || !vendorData.streetAddress || 
        !vendorData.city || !vendorData.state || !vendorData.zipCode || 
        !vendorData.email || !vendorData.password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Vendor signup process starting

    try {
      // Create the user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: vendorData.email,
        password: vendorData.password,
        options: {
          data: {
            user_type: 'VENDOR',
            name: vendorData.businessName,           // Business name becomes profile name
            sex: 'Other',                           // Placeholder value
            birth_year: 1990,                       // Placeholder value
            occupation: vendorData.industry,         // Industry becomes occupation
            business_name: vendorData.businessName,
            industry: vendorData.industry,
            street_address: vendorData.streetAddress,
            address_line_2: vendorData.addressLine2,
            city: vendorData.city,
            state: vendorData.state,
            zip_code: vendorData.zipCode,
          },
        },
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        console.error('Signup error details:', {
          message: signUpError.message,
          status: signUpError.status,
          name: signUpError.name
        });
        setError(`Signup failed: ${signUpError.message}`);
        setLoading(false);
        return;
      }

      console.log('Signup response:', signUpData);
      console.log('User created:', signUpData.user);
      console.log('Session:', signUpData.session);

      if (signUpData.user) {
        // The trigger function will automatically create the profile with all vendor fields
        
        // Check if email confirmation is required
        if (signUpData.user && !signUpData.session) {
          console.log('Email confirmation required. User created but no session.');
          alert('Vendor account created successfully! Please check your email to confirm your account, then log in.');
          router.push('/login');
          return;
        }
        
        // If we have a session, try to automatically sign in
        if (signUpData.session) {
          console.log('Session available, redirecting to vendor dashboard');
          router.push('/dashboard/vendor');
        } else {
          // Try to sign in manually
          console.log('No session, attempting manual signin...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: vendorData.email,
            password: vendorData.password,
          });

          if (signInError) {
            console.error('Auto-signin error:', signInError);
            alert('Vendor account created successfully! Please check your email to confirm your account and then log in.');
            router.push('/login');
          } else {
            console.log('Auto-signin successful, redirecting to vendor dashboard');
            router.push('/dashboard/vendor');
          }
        }
      }
    } catch (error: any) {
      console.error('Vendor signup error:', error);
      setError(error.message || 'An unexpected error occurred');
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-transparent text-orbit-text p-4">
       <div className="absolute top-4 left-4">
        <button onClick={handleBack} className="orbit-btn-ghost text-orbit-text2 hover:text-orbit-text underline font-light">
          Back
        </button>
      </div>
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
        {step === 1 && (
          <div className="flex flex-col items-center justify-center gap-8">
            <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
              Tell us about your business
            </h1>
            <input
              type="text"
              value={vendorData.businessName}
              onChange={(e) => setVendorData({ ...vendorData, businessName: e.target.value })}
              placeholder="Business Name"
              className="orbit-ring w-full max-w-md rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
            />
            <input
              type="text"
              value={vendorData.industry}
              onChange={(e) => setVendorData({ ...vendorData, industry: e.target.value })}
              placeholder="Industry (e.g., Restaurant, Bar, Cafe)"
              className="orbit-ring w-full max-w-md rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
            />
            <button
              onClick={handleNext}
              disabled={!vendorData.businessName || !vendorData.industry}
              className="orbit-btn-primary min-h-[48px] px-10 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
        
        {step === 2 && (
          <div className="flex flex-col items-center justify-center gap-8">
            <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
              Business Address
            </h1>
            <div className="flex flex-col gap-4 w-full max-w-md">
              <input
                type="text"
                value={vendorData.streetAddress}
                onChange={(e) => setVendorData({ ...vendorData, streetAddress: e.target.value })}
                placeholder="Street Address"
                className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
              />
              <input
                type="text"
                value={vendorData.addressLine2}
                onChange={(e) => setVendorData({ ...vendorData, addressLine2: e.target.value })}
                placeholder="Apartment, Suite, etc. (Optional)"
                className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={vendorData.city}
                  onChange={(e) => setVendorData({ ...vendorData, city: e.target.value })}
                  placeholder="City"
                  className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
                />
                <input
                  type="text"
                  value={vendorData.state}
                  onChange={(e) => setVendorData({ ...vendorData, state: e.target.value })}
                  placeholder="State"
                  className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
                />
              </div>
              <input
                type="text"
                value={vendorData.zipCode}
                onChange={(e) => setVendorData({ ...vendorData, zipCode: e.target.value })}
                placeholder="ZIP Code"
                className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
              />
            </div>
            <button
              onClick={handleNext}
              disabled={!vendorData.streetAddress || !vendorData.city || !vendorData.state || !vendorData.zipCode}
              className="orbit-btn-primary min-h-[48px] px-10 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            {(!vendorData.streetAddress || !vendorData.city || !vendorData.state || !vendorData.zipCode) && (
              <p className="text-sm text-orbit-muted">Please fill in all address fields to continue</p>
            )}
          </div>
        )}
        
        {step === 3 && (
          <div className="flex flex-col items-center justify-center gap-8">
            <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
              Create your account
            </h1>
            <p className="text-xl text-orbit-muted font-light">
              Almost there! Just a few more details to get you started.
            </p>
            <div className="flex flex-col gap-4 w-full max-w-md">
              <input
                type="email"
                placeholder="Email"
                value={vendorData.email}
                onChange={(e) => setVendorData({ ...vendorData, email: e.target.value })}
                className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
              />
              <input
                type="password"
                placeholder="Password (at least 6 characters)"
                value={vendorData.password}
                onChange={(e) => setVendorData({ ...vendorData, password: e.target.value })}
                className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
              />
            </div>
            {error && <p className="text-red-500 font-light">{error}</p>}
            <button
              onClick={handleComplete}
              disabled={loading || !vendorData.email || vendorData.password.length < 6}
              className="orbit-btn-primary min-h-[48px] px-10 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Complete Sign Up'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
} 