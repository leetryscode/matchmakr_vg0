'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/ui/SectionHeader';

export interface PendingSponsorshipRequest {
  id: string;
  single_id: string;
  status: string;
  invite_id: string | null;
  created_at: string;
}

interface SponsorshipRequestsSectionProps {
  requests: PendingSponsorshipRequest[];
  singleNameMap: Record<string, string>;
}

export default function SponsorshipRequestsSection({
  requests,
  singleNameMap,
}: SponsorshipRequestsSectionProps) {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localRequests, setLocalRequests] = useState(requests);

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase.rpc('accept_sponsorship_request_as_sponsor', {
        p_request_id: requestId,
      });
      if (error) throw error;
      setLocalRequests((prev) => prev.filter((r) => r.id !== requestId));
      router.refresh();
    } catch (err) {
      console.error('Accept error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase.rpc('decline_sponsorship_request_as_sponsor', {
        p_request_id: requestId,
      });
      if (error) throw error;
      setLocalRequests((prev) => prev.filter((r) => r.id !== requestId));
      router.refresh();
    } catch (err) {
      console.error('Decline error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (localRequests.length === 0) return null;

  return (
    <section className="mt-10">
      <SectionHeader title="Sponsorship requests" />
      <p className="type-meta text-orbit-muted mb-4">
        Singles who invited you to be their sponsor. Accept to add them to your orbit.
      </p>
      <div className="flex flex-col gap-3">
        {localRequests.map((req) => (
          <GlassCard key={req.id} className="p-4">
            <p className="type-body text-orbit-text mb-4">
              {singleNameMap[req.single_id] || 'Someone'} wants you to be their sponsor
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleAccept(req.id)}
                disabled={actionLoading === req.id}
                className="rounded-cta px-4 py-2 min-h-[40px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === req.id ? 'Accepting...' : 'Accept'}
              </button>
              <button
                onClick={() => handleDecline(req.id)}
                disabled={actionLoading === req.id}
                className="orbit-btn-secondary px-4 py-2 min-h-[40px] rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decline
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
