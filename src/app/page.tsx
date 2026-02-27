import React, { Suspense } from 'react';
import Link from 'next/link';
import BootTimeoutMessage from '@/components/BootTimeoutMessage';

export default function HomePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-transparent text-orbit-text p-4">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-4xl font-light tracking-tight sm:text-5xl md:text-[5rem] leading-[1.1] text-center text-orbit-text">
          <span className="text-2xl sm:text-3xl md:text-4xl font-extralight text-orbit-text block mb-2">Welcome to</span>
          <span className="font-light tracking-[0.15em] uppercase text-orbit-text font-brand">Orbit</span>
        </h1>
        
        <Suspense fallback={null}>
          <BootTimeoutMessage />
        </Suspense>
        
        {/* Space for future slogan */}
        <div className="h-12 sm:h-16 md:h-20"></div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/onboarding" className="orbit-btn-primary inline-block min-h-[48px] px-8 py-3 text-base tracking-[0.02em] text-center no-underline">
            Get Started
          </Link>
          <Link href="/login" className="orbit-btn-ghost px-8 py-3 font-light text-orbit-text2 hover:text-orbit-text transition-colors duration-200 text-center no-underline">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}