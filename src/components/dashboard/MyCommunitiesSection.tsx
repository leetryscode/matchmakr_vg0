'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type MyCommunity = {
    id: string;
    name: string;
    description: string | null;
    join_mode: 'open' | 'sponsor_invite_only';
    role: 'founder' | 'member';
    joined_at: string;
};

type MyCommunitiesSectionProps = {
    descriptionText?: string;
    helperText?: string;
};

function ExploreTile() {
    return (
        <Link
            href="/communities"
            className="group flex h-28 w-[170px] flex-shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-orbit-border/70 bg-orbit-surface/50 px-4 text-center transition-colors hover:bg-orbit-border/20 focus:outline-none focus:ring-2 focus:ring-orbit-gold/50"
            aria-label="Explore communities"
        >
            <span className="type-section text-orbit-text">+ Explore</span>
            <span className="mt-1 text-xs text-orbit-muted">Find communities</span>
        </Link>
    );
}

function CommunityTile({ community }: { community: MyCommunity }) {
    const roleLabel = community.role === 'founder' ? 'Founder' : 'Member';

    return (
        <Link
            href="/communities"
            className="flex h-28 w-[170px] flex-shrink-0 flex-col justify-between rounded-2xl border border-orbit-border/60 orbit-surface px-4 py-3 transition-colors hover:bg-orbit-border/20 focus:outline-none focus:ring-2 focus:ring-orbit-gold/50"
            role="listitem"
            aria-label={`${community.name} community`}
        >
            <div className="min-w-0">
                <p className="type-section truncate text-orbit-text">{community.name}</p>
                {community.description ? (
                    <p className="mt-1 truncate text-xs text-orbit-muted">{community.description}</p>
                ) : null}
            </div>
            <p className="text-sm font-semibold italic text-orbit-text2">
                {roleLabel}
            </p>
        </Link>
    );
}

function LoadingTile() {
    return (
        <div className="h-28 w-[170px] flex-shrink-0 animate-pulse rounded-2xl border border-orbit-border/40 orbit-surface px-4 py-3">
            <div className="h-4 w-24 rounded bg-orbit-border/40" />
            <div className="mt-2 h-3 w-32 rounded bg-orbit-border/30" />
            <div className="mt-8 h-3 w-20 rounded bg-orbit-border/30" />
        </div>
    );
}

export default function MyCommunitiesSection({
    descriptionText = 'The networks you belong to.',
    helperText,
}: MyCommunitiesSectionProps) {
    const [communities, setCommunities] = useState<MyCommunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCommunities = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/communities/me');
            if (!response.ok) {
                throw new Error('Failed to load communities');
            }

            const data = await response.json();
            setCommunities(Array.isArray(data.communities) ? data.communities : []);
        } catch {
            setCommunities([]);
            setError('Could not load your communities right now.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCommunities();
    }, [loadCommunities]);

    return (
        <div>
            <div className="mb-3">
                <h2 className="type-section text-orbit-text">My Communities</h2>
                {descriptionText ? (
                    <p className="mt-1 text-xs text-orbit-muted">
                        {descriptionText}
                    </p>
                ) : null}
            </div>

            {error ? (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-orbit-border/60 bg-orbit-surface/40 px-3 py-2">
                    <p className="text-xs text-orbit-muted">{error}</p>
                    <button
                        type="button"
                        onClick={loadCommunities}
                        className="orbit-btn-secondary min-h-[32px] rounded-lg px-3 py-1 text-xs"
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            {isLoading ? (
                <div
                    className="flex flex-nowrap gap-3 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label="Loading communities"
                >
                    <LoadingTile />
                    <LoadingTile />
                    <ExploreTile />
                </div>
            ) : communities.length === 0 ? (
                <div
                    className="flex flex-nowrap gap-3 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    role="list"
                    aria-label="Communities row"
                >
                    <ExploreTile />
                </div>
            ) : (
                <div
                    className="flex flex-nowrap gap-3 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    role="list"
                    aria-label="Communities row"
                >
                    {communities.map((community) => (
                        <CommunityTile key={community.id} community={community} />
                    ))}
                    <ExploreTile />
                </div>
            )}
        </div>
    );
}
