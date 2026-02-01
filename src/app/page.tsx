import React, { Suspense } from 'react';
import Link from 'next/link';
import BootTimeoutMessage from '@/components/BootTimeoutMessage';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-text-dark">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-4xl font-light tracking-tight sm:text-5xl md:text-[5rem] leading-[1.1] text-center text-text-dark">
          <span className="text-2xl sm:text-3xl md:text-4xl font-extralight text-text-dark block mb-2">Welcome to</span>
          <span className="font-light tracking-[0.15em] uppercase text-text-dark font-brand">Orbit</span>
        </h1>
        
        <Suspense fallback={null}>
          <BootTimeoutMessage />
        </Suspense>
        
        {/* Space for future slogan */}
        <div className="h-12 sm:h-16 md:h-20"></div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/onboarding" className="inline-block rounded-cta bg-action-entry text-primary-blue font-semibold shadow-cta-entry hover:bg-action-entry-hover active:bg-action-entry-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 min-h-[48px] px-8 py-3 text-base tracking-[0.02em] text-center no-underline">
            Get Started
          </Link>
          <Link href="/login" className="rounded-lg px-8 py-3 font-light text-text-dark hover:text-white transition-colors duration-200 text-center shadow-sm hover:shadow-md no-underline">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}