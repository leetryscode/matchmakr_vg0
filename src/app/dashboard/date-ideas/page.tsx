'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardFooterSpacer from '@/components/dashboard/DashboardFooterSpacer';
import { createClient } from '@/lib/supabase/client';

const VIBE_TAGS = ['Cozy', 'Adventure', 'Upscale', 'Casual', 'Creative', 'Outdoors', 'Foodie', 'Night out'];

type Community = {
  id: string;
  name: string;
};

export default function DateIdeasPage() {
  const { user } = useAuth();

  const [venueName, setVenueName] = useState('');
  const [reason, setReason] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const [countResult, communitiesResult] = await Promise.all([
      supabase.from('date_idea_suggestions').select('*', { count: 'exact', head: true }),
      fetch('/api/communities/me'),
    ]);

    if (countResult.count !== null) {
      setCount(countResult.count);
    }

    if (communitiesResult.ok) {
      const data = await communitiesResult.json();
      setCommunities(Array.isArray(data.communities) ? data.communities : []);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user) return null;

  const toggleVibe = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const toggleCommunity = (id: string) => {
    setSelectedCommunities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');
    const supabase = createClient();

    const { error } = await supabase.from('date_idea_suggestions').insert({
      user_id: user.id,
      venue_name: venueName.trim(),
      reason: reason.trim() || null,
      vibe_tags: selectedVibes.length > 0 ? selectedVibes : null,
      community_ids: selectedCommunities.length > 0 ? selectedCommunities : null,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage('Something went wrong. Please try again.');
    } else {
      setVenueName('');
      setReason('');
      setSelectedVibes([]);
      setSelectedCommunities([]);
      setCount((prev) => (prev !== null ? prev + 1 : 1));
      setShowSuccess(true);
    }
  };

  return (
    <DashboardWrapper>
      <DashboardLayout firstName={null} userId={user.id}>
        <div className="flex flex-col space-y-6 w-full">

          {/* Hero Section */}
          <div className="flex flex-col items-center text-center pt-4 gap-3">
            <div className="text-orbit-gold overflow-visible">
              <svg
                width="52"
                height="56"
                viewBox="0 -1 24 26"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A7 7 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5" />
              </svg>
            </div>
            <h1 className="type-display text-orbit-text">Date ideas</h1>
            <p className="text-orbit-text2 text-base">
              Curated spots and experiences for unforgettable first dates.{' '}
              <span className="text-orbit-gold">Coming soon.</span>
            </p>
            <p className="text-orbit-muted text-sm max-w-xs">
              Help us build this by sharing your favorite date spots. The best suggestions will be featured when we launch.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-orbit-border" />

          {/* Suggestion Form / Success State */}
          <div className="flex flex-col gap-5">
            {showSuccess ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                {/* Gold checkmark icon */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  className="text-orbit-gold"
                >
                  <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M15 24l7 7 11-13"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <h2 className="type-title text-orbit-text">You're shaping date ideas</h2>

                <p className="text-orbit-text2 text-sm max-w-xs leading-relaxed">
                  Your recommendation has been saved. When Date Ideas launches, the best suggestions from our community will be featured as curated date spots — complete with reviews, vibes, and easy sharing between sponsors and singles. Your taste is helping build something special.
                </p>

                <button
                  type="button"
                  onClick={() => setShowSuccess(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium border border-orbit-gold text-orbit-gold bg-transparent hover:bg-orbit-gold/10 transition-colors"
                >
                  Share another spot
                </button>

                {/* Social proof counter */}
                <p className="text-center text-orbit-muted text-xs">
                  {count === null
                    ? '\u00A0'
                    : count === 0
                    ? 'Be the first to share a recommendation'
                    : `${count} suggestion${count === 1 ? '' : 's'} shared so far`}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-orbit-muted">
                  Suggest a spot
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Venue Name */}
                  <input
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Name of the venue or experience"
                    required
                    className="w-full bg-orbit-surface/80 border border-orbit-border/50 rounded-xl px-4 py-3 text-orbit-text placeholder:text-orbit-muted text-sm focus:outline-none focus:ring-2 focus:ring-orbit-gold/30"
                  />

                  {/* Reason */}
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="What makes it a great date spot?"
                    rows={3}
                    className="w-full bg-orbit-surface/80 border border-orbit-border/50 rounded-xl px-4 py-3 text-orbit-text placeholder:text-orbit-muted text-sm focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 resize-none"
                  />

                  {/* Vibe Tags */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-orbit-muted mb-3">
                      Pick a vibe
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {VIBE_TAGS.map((vibe) => {
                        const selected = selectedVibes.includes(vibe);
                        return (
                          <button
                            key={vibe}
                            type="button"
                            onClick={() => toggleVibe(vibe)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              selected
                                ? 'border-orbit-gold text-orbit-gold bg-orbit-gold/10'
                                : 'border-orbit-border text-orbit-muted bg-transparent hover:border-orbit-border/80'
                            }`}
                          >
                            {vibe}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Community Tags */}
                  {communities.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-orbit-muted mb-3">
                        Tag your communities
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {communities.map((community) => {
                          const selected = selectedCommunities.includes(community.id);
                          return (
                            <button
                              key={community.id}
                              type="button"
                              onClick={() => toggleCommunity(community.id)}
                              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                selected
                                  ? 'border-orbit-gold text-orbit-gold bg-orbit-gold/10'
                                  : 'border-orbit-border text-orbit-muted bg-transparent hover:border-orbit-border/80'
                              }`}
                            >
                              {community.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !venueName.trim()}
                    className="w-full py-3 rounded-xl font-medium text-sm text-orbit-canvas disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    style={{
                      background: 'linear-gradient(135deg, rgb(var(--orbit-gold-dk)), rgb(var(--orbit-gold)))',
                    }}
                  >
                    {isSubmitting ? 'Saving...' : 'Share your recommendation'}
                  </button>
                  {errorMessage && (
                    <p className="text-red-400 text-sm text-center">{errorMessage}</p>
                  )}
                </form>

                {/* Social proof counter */}
                <p className="text-center text-orbit-muted text-xs">
                  {count === null
                    ? '\u00A0'
                    : count === 0
                    ? 'Be the first to share a recommendation'
                    : `${count} suggestion${count === 1 ? '' : 's'} shared so far`}
                </p>
              </>
            )}
          </div>

          <DashboardFooterSpacer />
        </div>

      </DashboardLayout>
    </DashboardWrapper>
  );
}
