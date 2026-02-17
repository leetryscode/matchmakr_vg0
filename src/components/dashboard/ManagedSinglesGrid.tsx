'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import SectionHeader from '@/components/ui/SectionHeader';
import ManagedSingleCard from './ManagedSingleCard';
import TemplateManagedSingleCard from './TemplateManagedSingleCard';
import InviteRowCard, { type InviteRowStatus } from './InviteRowCard';
import InviteSingleModal from './InviteSingleModal';

import { SingleStatus } from '@/lib/status/singleStatus';

export interface InviteRow {
  type: 'invite';
  id: string;
  invitee_email: string;
  invitee_phone_e164?: string | null;
  invitee_label?: string | null;
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
              inviteeLabel={row.invitee_label}
              inviteeUserId={row.invitee_user_id}
              status={row.status}
              createdAt={row.created_at}
              declineSubtext={row.decline_subtext}
              onClick={row.is_clickable && row.profile_id ? () => handleCardClick(row.profile_id!) : undefined}
            />
          ))}
        </div>
      )}

      <InviteSingleModal
        open={isInviteSingleModalOpen}
        onClose={() => setIsInviteSingleModalOpen(false)}
      />
    </div>
  );
}
