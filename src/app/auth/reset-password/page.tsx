'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [expired, setExpired] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let resolved = false;

    const showFormNow = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      setShowForm(true);
    };

    // Primary: check for an existing session immediately.
    // With PKCE flow the token is exchanged before this page loads,
    // so any user arriving here from the email link will already have a session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) showFormNow();
    });

    // Secondary: catch PASSWORD_RECOVERY in case the session isn't ready on mount yet
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') showFormNow();
    });

    // After 5 seconds with no session or event, treat the link as expired
    timeoutId = setTimeout(() => {
      if (!resolved) setExpired(true);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/dashboard'), 2000);
  };

  const inputClass = [
    'w-full rounded-xl px-4 py-3 font-light',
    'border border-white/15 bg-white/5 text-white/90',
    'placeholder:text-white/30',
    'focus:outline-none focus:border-[rgb(var(--orbit-gold))/0.4] focus:bg-white/7',
    'transition-colors duration-200',
  ].join(' ');

  return (
    <main
      className="flex min-h-[100dvh] flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'rgb(var(--orbit-canvas))', color: 'rgb(var(--orbit-text))' }}
    >
      <div className="flex flex-col items-center gap-6 w-full max-w-md">

        <h1 className="text-4xl font-light tracking-tight text-orbit-text leading-[1.1]">
          New password
        </h1>

        <div className="orbit-surface-strong rounded-card-lg shadow-card px-6 py-6 w-full">

          {success ? (
            <div className="flex flex-col gap-3">
              <p className="text-orbit-gold font-light">
                Password updated. Redirecting you now&hellip;
              </p>
            </div>
          ) : expired ? (
            <div className="flex flex-col gap-3">
              <p className="text-orbit-warning font-light text-sm">
                This link may have expired.
              </p>
              <p className="text-orbit-muted font-light text-sm">
                Please{' '}
                <a href="/login" className="text-orbit-gold hover:text-orbit-text transition-colors">
                  request a new reset link
                </a>
                .
              </p>
            </div>
          ) : !showForm ? (
            <div className="flex flex-col gap-3">
              <p className="text-orbit-muted font-light text-sm">
                Waiting for password recovery link&hellip;
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={inputClass}
              />
              {error && (
                <p className="text-orbit-warning font-light text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="orbit-btn-primary min-h-[48px] px-10 py-3 text-base tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Reset password'}
              </button>
            </form>
          )}

        </div>

        <a
          href="/login"
          className="orbit-btn-ghost text-orbit-text2 hover:text-orbit-text no-underline mt-2 font-light"
        >
          Back to sign in
        </a>

      </div>
    </main>
  );
}
