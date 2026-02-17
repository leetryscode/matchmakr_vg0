'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteSingleByEmail } from '@/lib/invite';
import SectionHeader from '@/components/ui/SectionHeader';
import ManagedSingleCard from './ManagedSingleCard';
import TemplateManagedSingleCard from './TemplateManagedSingleCard';
import InviteRowCard, { type InviteRowStatus } from './InviteRowCard';

import { SingleStatus } from '@/lib/status/singleStatus';

export interface InviteRow {
  type: 'invite';
  id: string;
  invitee_email: string;
  invitee_phone_e164?: string | null;
  invitee_user_id: string | null;
  status: InviteRowStatus;
  profile_id: string | null;
  created_at?: string;
  decline_subtext?: 'expired' | 'cancelled' | null;
  is_clickable?: boolean;
}

interface ManagedSinglesGridProps {
  singles: Array<{
    id: string;
    name: string | null;
    sponsor_label: string | null;
    status: SingleStatus;
    approved_match_count: number;
  }>;
  inviteRows?: InviteRow[];
  userId?: string;
}

export default function ManagedSinglesGrid({ singles, inviteRows = [], userId }: ManagedSinglesGridProps) {
  const router = useRouter();
  const [isInviteSingleModalOpen, setIsInviteSingleModalOpen] = useState(false);
  const [inviteSingleEmail, setInviteSingleEmail] = useState('');
  const [inviteSingleName, setInviteSingleName] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleCardClick = (singleId: string) => {
    router.push(`/profile/${singleId}`);
  };

  const openInviteModal = () => setIsInviteSingleModalOpen(true);

  const hasAnyRows = (singles?.length ?? 0) > 0 || inviteRows.length > 0;

  return (
    <div>
      <SectionHeader
        title="Managed Singles"
        className="mt-10"
        right={
          <button
            onClick={openInviteModal}
            className="type-meta bg-background-card hover:bg-background-card/90 rounded-lg px-3 py-1 transition-colors shadow-sm hover:shadow-md"
          >
            Invite
          </button>
        }
      />

      {!hasAnyRows ? (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <TemplateManagedSingleCard onInviteClick={openInviteModal} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-2">
          {singles?.map((single) => (
            <ManagedSingleCard
              key={single.id}
              single={single}
              status={single.status}
              approvedMatchCount={single.approved_match_count}
              onClick={() => handleCardClick(single.id)}
            />
          ))}
          {inviteRows.map((row) => (
            <InviteRowCard
              key={row.id}
              inviteeEmail={row.invitee_email}
              inviteePhoneE164={row.invitee_phone_e164}
              inviteeUserId={row.invitee_user_id}
              status={row.status}
              createdAt={row.created_at}
              declineSubtext={row.decline_subtext}
              onClick={row.is_clickable && row.profile_id ? () => handleCardClick(row.profile_id!) : undefined}
            />
          ))}
        </div>
      )}

      {/* Invite Single Modal */}
      {isInviteSingleModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-white/20">
            <h2 className="type-section mb-4 text-text-dark">Invite a single</h2>
            <p className="text-text-light mb-2 leading-relaxed">
              Invite someone by email. We&apos;ll show them here once they join Orbit.
            </p>
            <p className="text-xs text-text-light mb-6">
              If they already have an account, they&apos;ll get a request to approve.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <input
                  type="text"
                  value={inviteSingleName}
                  onChange={(e) => {
                    setInviteSingleName(e.target.value);
                    setInviteError(null);
                  }}
                  placeholder="Name (only visible to you)"
                  required
                  className="w-full border border-white/20 rounded-xl px-4 py-3 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                />
                <p className="text-xs text-text-light mt-1 text-left">
                  This helps you keep track. They can change their name after joining.
                </p>
              </div>
              <div>
                <input
                  type="email"
                  value={inviteSingleEmail}
                  onChange={(e) => {
                    setInviteSingleEmail(e.target.value);
                    setInviteError(null);
                  }}
                  placeholder="Single user's email address"
                  required
                  className="w-full border border-white/20 rounded-xl px-4 py-3 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                />
                {inviteError && (
                  <p className="text-sm text-red-600 mt-2 text-left">
                    {inviteError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsInviteSingleModalOpen(false);
                  setInviteSingleEmail('');
                  setInviteSingleName('');
                  setInviteError(null);
                }}
                className="px-6 py-3 bg-white/20 text-text-dark rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 shadow-button hover:shadow-button-hover"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!inviteSingleName.trim()) {
                    setInviteError('Please enter a name.');
                    return;
                  }
                  if (!inviteSingleEmail.trim()) {
                    setInviteError('Please enter an email address.');
                    return;
                  }

                  setInviteError(null);

                  try {
                    await inviteSingleByEmail(inviteSingleEmail, inviteSingleName.trim());
                    setIsInviteSingleModalOpen(false);
                    setInviteSingleEmail('');
                    setInviteSingleName('');
                    setInviteError(null);
                    router.refresh();
                  } catch (e) {
                    setInviteError(e instanceof Error ? e.message : 'An error occurred. Please try again.');
                  }
                }}
                className="rounded-cta px-6 py-3 min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200"
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
