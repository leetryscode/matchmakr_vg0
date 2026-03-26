'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedGoldBorder from '@/components/ui/AnimatedGoldBorder';

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
  singlePhotoMap: Record<string, string | null>;
}

export default function SponsorshipRequestsSection({
  requests,
  singleNameMap,
  singlePhotoMap,
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
    <section className="mt-10 first:mt-0">
      <div className="flex flex-col gap-3">
        {localRequests.map((req) => {
          const name = singleNameMap[req.single_id] || 'Someone';
          const photo = singlePhotoMap[req.single_id] ?? null;
          return (
            <AnimatedGoldBorder key={req.id}>
              <GlassCard className="p-5 border-transparent">
                <div className="flex items-center gap-3 mb-5">
                  {photo && (
                    <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={photo}
                        alt={name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <p className="type-section" style={{ fontWeight: 500 }}>
                    {name} wants you to be their sponsor
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAccept(req.id)}
                    disabled={actionLoading === req.id}
                    className="rounded-cta px-5 py-2 min-h-[40px] bg-orbit-gold text-orbit-canvas font-semibold shadow-cta-entry hover:bg-orbit-goldDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {actionLoading === req.id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleDecline(req.id)}
                    disabled={actionLoading === req.id}
                    className="px-4 py-2 min-h-[40px] rounded-lg font-semibold bg-transparent text-orbit-muted border border-orbit-border hover:text-orbit-text hover:border-orbit-border/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Decline
                  </button>
                </div>
              </GlassCard>
            </AnimatedGoldBorder>
          );
        })}
      </div>
    </section>
  );
}
