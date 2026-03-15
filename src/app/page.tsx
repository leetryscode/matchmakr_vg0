import React, { Suspense } from 'react';
import Link from 'next/link';
import BootTimeoutMessage from '@/components/BootTimeoutMessage';

export default function HomePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-transparent p-4">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-center leading-[1.1]">
          <span className="onboarding-muted mb-2 block text-xs uppercase tracking-[0.25em] sm:text-sm">Welcome to</span>
          <span className="onboarding-heading text-5xl font-light uppercase tracking-[0.2em] sm:text-6xl md:text-7xl">Orbit</span>
        </h1>
        
        <Suspense fallback={null}>
          <BootTimeoutMessage />
        </Suspense>
        
        {/* Space for future slogan */}
        <div className="h-12 sm:h-16 md:h-20"></div>
        
        <div className="flex w-full max-w-md flex-col items-center gap-3">
          <Link href="/onboarding" className="onboarding-btn-primary inline-flex w-full justify-center text-center">
            Get Started
          </Link>
          <Link href="/login" className="onboarding-btn-ghost text-center">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}