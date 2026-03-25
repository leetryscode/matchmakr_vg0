'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getStatusPillClasses, type InviteRowStatus } from '@/lib/status/singleStatus';

export type { InviteRowStatus };

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

const RescindConfirmModal: React.FC<{
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ name, onConfirm, onCancel, loading }) => {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={onCancel}
    >
      <div
        className="orbit-surface2 rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-orbit-text mb-2">Rescind invitation?</h2>
        <p className="type-body text-orbit-muted mb-6">
          This will cancel your invitation to <span className="text-orbit-text font-medium">{name}</span>. You can always send a new one later.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="orbit-btn-secondary px-4 py-2 rounded-lg type-meta disabled:opacity-50"
          >
            Never mind
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg type-meta font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#b34a4a' }}
          >
            {loading ? 'Rescinding…' : 'Rescind'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

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
  const [showConfirm, setShowConfirm] = useState(false);
  const primaryLabel = inviteeLabel || inviteeEmail || inviteePhoneE164 || 'Invited';
  const dateStr = formatInviteDate(createdAt);
  const isClickable = !!onClick;
  const canRescind = (status === 'INVITED' || status === 'AWAITING_APPROVAL') && !rescindLoading;

  const handleRescindClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canRescind) return;
    setShowConfirm(true);
  };

  const handleRescindConfirm = async () => {
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
    setShowConfirm(false);
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
      className={`orbit-card p-4 group ${
        isClickable
          ? 'hover:shadow-card-hover hover:-translate-y-[1px] active:translate-y-0 active:shadow-card cursor-pointer focus:outline-none focus:ring-2 focus:ring-orbit-gold/50'
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
        <h3 className="text-base font-semibold text-orbit-text flex-1 pr-2 truncate">
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
            className="text-orbit-muted group-hover:text-orbit-gold transition-colors flex-shrink-0"
          >
            <polyline points="9,18 15,12 9,6" />
          </svg>
        )}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={getStatusPillClasses(status)}>
          {STATUS_LABELS[status]}
        </span>
        {canRescind && (
          <button
            type="button"
            onClick={handleRescindClick}
            disabled={rescindLoading}
            className="type-meta orbit-muted hover:opacity-80 underline underline-offset-2 transition-colors disabled:opacity-50"
          >
            Rescind
          </button>
        )}
      </div>
      <div className="type-meta">
        {description}
      </div>
      {showConfirm && (
        <RescindConfirmModal
          name={primaryLabel}
          onConfirm={handleRescindConfirm}
          onCancel={() => setShowConfirm(false)}
          loading={rescindLoading}
        />
      )}
    </div>
  );
};

export default InviteRowCard;
