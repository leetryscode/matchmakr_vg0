import React from 'react';

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Authentication Error
        </h1>
        <p className="text-2xl">
          Something went wrong during the authentication process.
        </p>
        <p className="text-lg text-gray-400">
          Please try signing in again. If the problem persists, please contact support.
        </p>
        <a href="/login" className="text-pink-400 underline">
          Go to Login
        </a>
      </div>
    </main>
  );
} 