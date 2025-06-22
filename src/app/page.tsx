import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Welcome to <span className="text-pink-400">MatchMakr</span>
        </h1>
        <p className="text-2xl">Find your match today.</p>
        <div className="flex gap-4">
          <Link href="/onboarding" className="text-pink-400 underline">
            Get Started
          </Link>
          <Link href="/login" className="text-blue-400 underline">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}