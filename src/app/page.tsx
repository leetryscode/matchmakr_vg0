import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-gray-800">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Welcome to <span className="text-primary-blue">MatchMakr</span>
        </h1>
        <p className="text-2xl">Find your match today.</p>
        <div className="flex gap-4">
          <Link href="/onboarding" className="text-primary-blue underline hover:text-primary-blue-light transition-colors">
            Get Started
          </Link>
          <Link href="/login" className="text-accent-coral underline hover:text-primary-blue transition-colors">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}