'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

export type InviteRowStatus = 'INVITED' | 'AWAITING_APPROVAL' | 'ACCEPTED' | 'DECLINED';

interface InviteRowCardProps {
  inviteId: string;
  inviteeEmail: string;
  inviteePhoneE164?: string | null;
  inviteeLabel?: string | null;
  inviteeUserId: string | null;
  status: InviteRowStatus;
  createdAt?: string;
  declineSubtext?: 'expired' | 'cancelled' | null;
  onClick?: () => void;
}

const STATUS_PILL_BASE = 'inline-flex items-center rounded-full border-2 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase bg-transparent';

const STATUS_STYLES: Record<InviteRowStatus, string> = {
  INVITED: 'border-status-invited text-status-invited',
  AWAITING_APPROVAL: 'border-status-needs-attention text-status-needs-attention',
  ACCEPTED: 'border-status-in-motion text-status-in-motion',
  DECLINED: 'border-status-paused text-status-paused',
};

const STATUS_LABELS: Record<InviteRowStatus, string> = {
  INVITED: 'Invited',
  AWAITING_APPROVAL: 'Awaiting approval',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};

function formatInviteDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

const InviteRowCard: React.FC<InviteRowCardProps> = ({
  inviteId,
  inviteeEmail,
  inviteePhoneE164,
  inviteeLabel,
  inviteeUserId,
  status,
  createdAt,
  declineSubtext,
  onClick,
}) => {
  const router = useRouter();
  const [rescindLoading, setRescindLoading] = useState(false);
  const primaryLabel = inviteeLabel || inviteeEmail || inviteePhoneE164 || 'Invited';
  const dateStr = formatInviteDate(createdAt);
  const isClickable = status === 'ACCEPTED' && !!inviteeUserId && !!onClick;
  const canRescind = (status === 'INVITED' || status === 'AWAITING_APPROVAL') && !rescindLoading;

  const handleRescind = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canRescind) return;
    setRescindLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('cancel_invite_as_inviter', {
        p_invite_id: inviteId,
      });
      if (error) throw error;
      if (data?.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error('Rescind error:', err);
      setRescindLoading(false);
    }
  };

  let description: string;
  if (status === 'INVITED') {
    description = dateStr ? `Invited • ${dateStr}` : 'Invite pending';
  } else if (status === 'AWAITING_APPROVAL') {
    description = 'Waiting for them to accept';
  } else if (status === 'ACCEPTED') {
    description = 'They accepted';
  } else {
    if (declineSubtext === 'expired') description = 'Invite expired';
    else if (declineSubtext === 'cancelled') description = 'Invite cancelled';
    else description = 'Invite expired/declined';
  }

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`bg-background-card rounded-card-lg shadow-card p-4 group ${
        isClickable
          ? 'hover:bg-background-card/95 hover:shadow-card-hover hover:-translate-y-[1px] active:translate-y-0 active:shadow-card cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-blue/50'
          : ''
      }`}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-semibold text-text-dark flex-1 pr-2 truncate">
          {primaryLabel}
        </h3>
        {isClickable && (
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            className="text-text-light group-hover:text-primary-blue transition-colors flex-shrink-0"
          >
            <polyline points="9,18 15,12 9,6" />
          </svg>
        )}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`${STATUS_PILL_BASE} ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
        {canRescind && (
          <button
            type="button"
            onClick={handleRescind}
            disabled={rescindLoading}
            className="type-meta text-status-paused hover:text-status-paused/80 underline underline-offset-2 transition-colors disabled:opacity-50"
          >
            {rescindLoading ? 'Rescinding…' : 'Rescind'}
          </button>
        )}
      </div>
      <div className="type-meta">
        {description}
      </div>
    </div>
  );
};

export default InviteRowCard;
