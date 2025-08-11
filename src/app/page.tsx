import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-gray-800">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-light tracking-tight sm:text-[5rem] leading-[1.1]">
          Welcome to <span className="font-light tracking-[0.15em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>GREENLIGHT</span>
        </h1>
        <p className="text-2xl font-light text-gray-700">Find your match today.</p>
        <div className="flex gap-4">
          <Link href="/onboarding" className="rounded-full bg-gradient-primary px-8 py-3 font-light text-white shadow-button hover:shadow-button-hover hover:-translate-y-1 transition-all duration-300">
            Get Started
          </Link>
          <Link href="/login" className="rounded-full bg-gradient-light px-8 py-3 font-light text-white shadow-button hover:shadow-button-hover hover:-translate-y-1 transition-all duration-300">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}