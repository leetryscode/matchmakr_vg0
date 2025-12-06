import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-gray-800">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-4xl font-light tracking-tight sm:text-5xl md:text-[5rem] leading-[1.1] text-center">
          <span className="text-2xl sm:text-3xl md:text-4xl font-extralight text-gray-600 block mb-2">Welcome to</span>
          <span className="font-light tracking-[0.15em] uppercase text-gradient-light" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>Orbit</span>
        </h1>
        
        {/* Space for future slogan */}
        <div className="h-12 sm:h-16 md:h-20"></div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/onboarding" className="rounded-full bg-gradient-primary px-8 py-3 font-light text-white shadow-button hover:shadow-button-hover hover:-translate-y-1 transition-all duration-300 text-center">
            Get Started
          </Link>
          <Link href="/login" className="rounded-full gradient-border-button px-8 py-3 font-light text-gray-800 hover:shadow-button-hover hover:-translate-y-1 transition-all duration-300 text-center">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}