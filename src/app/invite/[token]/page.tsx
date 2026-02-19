'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import InviteGate from '@/components/invite/InviteGate';
import { setInviteMode, clearInviteMode } from '@/lib/invite-mode';

type InviteData = {
  invited_role: 'SPONSOR' | 'SINGLE';
  invitor_name: string;
  invitee_name: string | null;
  invitee_email: string | null;
  community_slug: string | null;
  status: string;
};

type FetchState = 'loading' | 'success' | 'not_found' | 'expired' | 'error';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';
  const [state, setState] = useState<FetchState>('loading');
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('not_found');
      return;
    }

    // Dev mock: /invite/testtoken returns mock data
    if (token === 'testtoken' && process.env.NODE_ENV === 'development') {
      setInvite({
        invited_role: 'SINGLE',
        invitor_name: 'Alex',
        invitee_name: 'Jordan',
        invitee_email: 'jordan@example.com',
        community_slug: 'north-county-san-diego',
        status: 'PENDING',
      });
      setState('success');
      return;
    }

    fetch(`/api/invite/${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          if (data.code === 'NOT_FOUND') {
            setState('not_found');
          } else if (data.code === 'EXPIRED_OR_INVALID') {
            setState('expired');
            setErrorMessage(data.error);
          } else {
            setState('error');
            setErrorMessage(data.error);
          }
          return;
        }
        setInvite(data);
        setState('success');
      })
      .catch(() => {
        setState('error');
        setErrorMessage('Something went wrong.');
      });
  }, [token]);

  const handleContinue = () => {
    if (!invite || !token) return;
    setInviteMode({
      inviteToken: token,
      lockedRole: invite.invited_role,
      prefillName: invite.invitee_name,
      prefillEmail: invite.invitee_email,
      prefillCommunity: invite.community_slug,
    });
    router.push('/onboarding');
  };

  const handleChooseDifferentRole = () => {
    clearInviteMode();
    router.push('/onboarding');
  };

  if (state === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-text-dark">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
          <p className="text-text-light font-light">Loading invite...</p>
        </div>
      </main>
    );
  }

  if (state === 'not_found') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-text-dark">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
          <h1 className="text-4xl font-light text-text-dark leading-[1.1] tracking-tight">
            Invite not found
          </h1>
          <p className="text-text-light font-light max-w-md">
            This invite link may be invalid or has been removed.
          </p>
          <Link
            href="/"
            className="rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover px-10 py-3 no-underline"
          >
            Go to Orbit
          </Link>
        </div>
      </main>
    );
  }

  if (state === 'expired' || state === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-text-dark">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
          <h1 className="text-4xl font-light text-text-dark leading-[1.1] tracking-tight">
            {state === 'expired' ? 'Invite no longer valid' : 'Something went wrong'}
          </h1>
          <p className="text-text-light font-light max-w-md">
            {errorMessage || 'This invite may have expired or already been used.'}
          </p>
          <Link
            href="/"
            className="rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover px-10 py-3 no-underline"
          >
            Go to Orbit
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main text-text-dark">
      <div className="absolute top-4 left-4">
        <Link href="/" className="text-text-dark underline hover:text-white transition-colors font-light">
          Home
        </Link>
      </div>
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
        {invite && (
          <InviteGate
            role={invite.invited_role}
            invitorName={invite.invitor_name}
            onContinue={handleContinue}
            onChooseDifferentRole={handleChooseDifferentRole}
          />
        )}
      </div>
    </main>
  );
}
