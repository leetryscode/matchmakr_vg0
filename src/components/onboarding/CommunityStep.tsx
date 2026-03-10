'use client';

import React, { useEffect, useState } from 'react';

export type CommunityIntent = { communityId: string } | null;

interface CommunityBrowseItem {
  id: string;
  name: string;
  description: string | null;
  join_mode: string;
  created_at: string;
}

interface CommunityStepProps {
  onNext: (intent: CommunityIntent) => void;
  variant?: 'single' | 'sponsor';
}

const SUBTEXT: Record<'single' | 'sponsor', string> = {
  single: 'Orbit is growing deliberately, community by community. Select a community to join after you sign up, or skip for now.',
  sponsor: 'Where do you make introductions? Select a community to join after you sign up, or skip for now.',
};

const JOIN_MODE_LABEL: Record<string, string> = {
  open: 'Open',
  sponsor_invite_only: 'Invite only',
};

function getJoinModeLabel(mode: string): string {
  return JOIN_MODE_LABEL[mode] ?? mode.replaceAll('_', ' ');
}

export default function CommunityStep({ onNext, variant }: CommunityStepProps) {
  const [communities, setCommunities] = useState<CommunityBrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadCommunities = () => {
    setLoading(true);
    setError(null);
    fetch('/api/communities')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load communities');
        return res.json();
      })
      .then((data: { communities: CommunityBrowseItem[] }) => {
        setCommunities(data.communities ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load communities');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCommunities();
  }, []);

  const subtext = variant ? SUBTEXT[variant] : '';
  const handleSelect = () => {
    if (selectedId) {
      onNext({ communityId: selectedId });
    }
  };
  const handleSkip = () => {
    onNext(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
          Orbit Community
        </h1>
        <p className="text-orbit-muted font-light">Loading communities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
          Orbit Community
        </h1>
        <p className="text-orbit-muted font-light">{error}</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={loadCommunities} className="orbit-btn-primary min-h-[48px] px-10 py-3">
            Retry
          </button>
          <button onClick={handleSkip} className="orbit-btn-ghost text-orbit-text2 hover:text-orbit-text underline font-light">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
        Orbit Community
      </h1>
      {subtext && (
        <p className="text-orbit-muted font-light text-center max-w-md">
          {subtext}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {communities.map((c) => {
          const isInviteOnly = c.join_mode === 'sponsor_invite_only';
          const isSelectable = !isInviteOnly;
          return (
            <button
              key={c.id}
              type="button"
              disabled={!isSelectable}
              onClick={() => isSelectable && setSelectedId(selectedId === c.id ? null : c.id)}
              className={`orbit-ring flex flex-col gap-2 rounded-card-lg p-6 text-left text-lg font-light transition-all duration-200 ${
                !isSelectable
                  ? 'opacity-60 cursor-not-allowed border-orbit-border/50 bg-orbit-surface/50 text-orbit-muted'
                  : selectedId === c.id
                    ? 'orbit-surface-strong border-orbit-gold/60 text-orbit-text card-hover-subtle hover:-translate-y-0.5'
                    : 'orbit-surface-soft text-orbit-text card-hover-subtle hover:-translate-y-0.5'
              }`}
            >
              <span className="font-medium">{c.name}</span>
              {c.description && (
                <span className="text-sm text-orbit-muted font-light line-clamp-2">{c.description}</span>
              )}
              <span className="text-xs text-orbit-muted">{getJoinModeLabel(c.join_mode)}</span>
            </button>
          );
        })}
      </div>
      {communities.length === 0 && (
        <p className="text-orbit-muted font-light">No communities yet. You can create or join one later from the dashboard.</p>
      )}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleSelect}
          disabled={!selectedId}
          className="orbit-btn-primary min-h-[48px] px-10 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue with selection
        </button>
        <button
          onClick={handleSkip}
          className="orbit-btn-ghost text-orbit-text2 hover:text-orbit-text underline font-light"
        >
          Skip — you can create or join a community later from the dashboard
        </button>
      </div>
    </div>
  );
}
