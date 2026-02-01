import React from 'react';

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background-main text-text-dark">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Authentication Error
        </h1>
        <p className="text-2xl">
          Something went wrong during the authentication process.
        </p>
        <p className="text-lg text-text-light">
          Please try signing in again. If the problem persists, please contact support.
        </p>
        <a href="/login" className="text-primary-blue underline">
          Go to Login
        </a>
      </div>
    </main>
  );
} 