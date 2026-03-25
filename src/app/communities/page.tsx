'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Community = {
    id: string;
    name: string;
    description: string | null;
    join_mode: 'open' | 'sponsor_invite_only';
    founder_name: string;
    member_count: number;
};

type MyCommunityMembership = {
    id: string;
    role?: 'founder' | 'member';
};

export default function CommunitiesPage() {
    const router = useRouter();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [myCommunityIds, setMyCommunityIds] = useState<Set<string>>(new Set());
    const [myCommunityRoleById, setMyCommunityRoleById] = useState<Map<string, 'founder' | 'member'>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);
    const [leavingCommunityId, setLeavingCommunityId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDescription, setCreateDescription] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    const loadCommunities = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [browseResponse, mineResponse] = await Promise.all([
                fetch('/api/communities'),
                fetch('/api/communities/me'),
            ]);

            if (!browseResponse.ok) {
                throw new Error('Failed to fetch communities.');
            }

            const browseData = await browseResponse.json();
            const mineData = mineResponse.ok ? await mineResponse.json() : { communities: [] };

            setCommunities(Array.isArray(browseData.communities) ? browseData.communities : []);

            const memberships = Array.isArray(mineData.communities) ? mineData.communities : [];
            const membershipIds = new Set<string>(
                memberships
                    .map((item: MyCommunityMembership) => item.id)
                    .filter((id: string | undefined): id is string => Boolean(id))
            );
            setMyCommunityIds(membershipIds);
            const roleById = new Map<string, 'founder' | 'member'>();
            memberships.forEach((item: MyCommunityMembership) => {
                if (item.id && (item.role === 'founder' || item.role === 'member')) {
                    roleById.set(item.id, item.role);
                }
            });
            setMyCommunityRoleById(roleById);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch communities.';
            setError(message);
            setCommunities([]);
            setMyCommunityIds(new Set());
            setMyCommunityRoleById(new Map());
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCommunities();
    }, [loadCommunities]);

    const sortedCommunities = useMemo(() => {
        const getJoinModeRank = (joinMode: Community['join_mode']) =>
            joinMode === 'open' ? 0 : 1;
        const getJoinedRoleRank = (communityId: string) => {
            const role = myCommunityRoleById.get(communityId);
            if (role === 'founder') return 0;
            if (role === 'member') return 1;
            return 2;
        };

        return [...communities].sort((a, b) => {
            const aIsJoined = myCommunityIds.has(a.id);
            const bIsJoined = myCommunityIds.has(b.id);
            if (aIsJoined !== bIsJoined) return aIsJoined ? -1 : 1;

            if (aIsJoined && bIsJoined) {
                const roleDiff = getJoinedRoleRank(a.id) - getJoinedRoleRank(b.id);
                if (roleDiff !== 0) return roleDiff;
            }

            const joinModeDiff = getJoinModeRank(a.join_mode) - getJoinModeRank(b.join_mode);
            if (joinModeDiff !== 0) return joinModeDiff;

            return a.name.localeCompare(b.name);
        });
    }, [communities, myCommunityIds, myCommunityRoleById]);

    const handleJoin = async (communityId: string) => {
        setJoiningCommunityId(communityId);
        try {
            const response = await fetch(`/api/communities/${communityId}/join`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to join community.');
            }

            await loadCommunities();
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to join community.';
            setError(message);
        } finally {
            setJoiningCommunityId(null);
        }
    };

    const handleLeave = async (communityId: string) => {
        setLeavingCommunityId(communityId);
        try {
            const response = await fetch(`/api/communities/${communityId}/leave`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to leave community.');
            }

            await loadCommunities();
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to leave community.';
            setError(message);
        } finally {
            setLeavingCommunityId(null);
        }
    };

    const resetCreateForm = () => {
        setCreateName('');
        setCreateDescription('');
        setCreateError(null);
    };

    const handleCreateCommunity = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!createName.trim()) {
            setCreateError('Name is required.');
            return;
        }

        setCreating(true);
        setCreateError(null);

        try {
            const response = await fetch('/api/communities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createName.trim(),
                    description: createDescription.trim() || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to create community.');
            }

            setShowCreateModal(false);
            resetCreateForm();
            await loadCommunities();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create community.';
            setCreateError(message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <main className="min-h-screen px-4 py-8 text-orbit-text">
            <div className="mx-auto w-full max-w-3xl">
                {/* Page header — no create button here */}
                <div className="mb-6">
                    <h1 className="type-section">Communities</h1>
                    <p className="mt-2 text-sm leading-relaxed text-orbit-muted" style={{ lineHeight: '1.5' }}>
                        Communities are the worlds you belong to — your neighborhood, your alumni network, your run club.
                        When sponsors search for their single, they can filter by community to find singles and sponsors who share their world.
                        Join the ones that represent you.
                    </p>
                </div>

                {error ? (
                    <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-orbit-border/60 bg-orbit-surface/40 px-3 py-2">
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
                    <div className="space-y-3">
                        <div className="h-24 animate-pulse rounded-2xl border border-orbit-border/40 bg-orbit-surface2" />
                        <div className="h-24 animate-pulse rounded-2xl border border-orbit-border/40 bg-orbit-surface2" />
                        <div className="h-24 animate-pulse rounded-2xl border border-orbit-border/40 bg-orbit-surface2" />
                    </div>
                ) : sortedCommunities.length === 0 ? (
                    <div className="rounded-2xl border border-orbit-border/60 bg-orbit-surface2 px-4 py-5">
                        <p className="text-sm text-orbit-muted">
                            No communities yet. Create one to begin building a trusted network.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedCommunities.map((community) => {
                            const isMember = myCommunityIds.has(community.id);
                            const isJoining = joiningCommunityId === community.id;
                            const isLeaving = leavingCommunityId === community.id;
                            const myRole = myCommunityRoleById.get(community.id);

                            return (
                                <div
                                    key={community.id}
                                    className="rounded-2xl border border-orbit-border/60 bg-orbit-surface2 px-4 py-4"
                                >
                                    {/* Header row: name/founder on left, member count + action on right */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="truncate text-base font-medium text-orbit-text">
                                                {community.name}
                                            </h2>
                                            <p className="mt-0.5 text-xs text-orbit-muted">
                                                Founded by {community.founder_name || 'Unknown'}
                                            </p>
                                        </div>
                                        <div className="flex flex-shrink-0 items-center gap-3">
                                            <span className="text-xs text-orbit-muted">
                                                {community.member_count} {community.member_count === 1 ? 'member' : 'members'}
                                            </span>
                                            {/* TEMP MVP: hide invite-only/open presentation in product UI.
                                                All communities are currently shown as joinable while invite-only UX is deferred. */}
                                            {isMember ? (
                                                myRole === 'founder' ? (
                                                    <span className="text-xs text-orbit-muted">Founder</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleLeave(community.id)}
                                                        disabled={isLeaving}
                                                        className="text-xs text-orbit-muted underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isLeaving ? 'Leaving...' : 'Joined'}
                                                    </button>
                                                )
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleJoin(community.id)}
                                                    disabled={isJoining}
                                                    className="rounded-full bg-orbit-gold px-4 py-[5px] text-xs font-medium text-orbit-canvas disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {isJoining ? 'Joining...' : 'Join'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description — max 2 lines */}
                                    {community.description ? (
                                        <p
                                            className="mt-2 text-[13px] text-orbit-text2"
                                            style={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {community.description}
                                        </p>
                                    ) : null}
                                </div>
                            );
                        })}

                        {/* Subtle "create" card at the bottom */}
                        <div
                            className="rounded-2xl border border-orbit-border/60 bg-orbit-surface2 px-4 py-4"
                            style={{ opacity: 0.6 }}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm text-orbit-muted">Don&apos;t see your community?</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(true);
                                        setCreateError(null);
                                    }}
                                    className="rounded-full border px-4 py-[5px] text-xs font-medium text-orbit-gold"
                                    style={{ borderColor: 'rgba(var(--orbit-gold), 0.4)' }}
                                >
                                    Create one
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6">
                    <Link
                        href="/dashboard"
                        className="orbit-btn-secondary inline-flex min-h-[40px] items-center rounded-lg px-4 py-2 text-sm"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </div>

            {showCreateModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-orbit-canvas/80 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-orbit-border/60 bg-orbit-surface2 p-5 shadow-card">
                        <h2 className="type-section">Create a community</h2>
                        <form onSubmit={handleCreateCommunity} className="mt-4 space-y-3">
                            <div>
                                <label htmlFor="community-name" className="mb-1 block text-xs text-orbit-muted">
                                    Name
                                </label>
                                <input
                                    id="community-name"
                                    type="text"
                                    value={createName}
                                    onChange={(e) => setCreateName(e.target.value)}
                                    className="orbit-ring w-full rounded-xl border border-orbit-border/60 bg-orbit-surface px-3 py-2 text-sm text-orbit-text"
                                    placeholder="Community name"
                                    maxLength={120}
                                    disabled={creating}
                                />
                            </div>

                            <div>
                                <label htmlFor="community-description" className="mb-1 block text-xs text-orbit-muted">
                                    Description
                                </label>
                                <textarea
                                    id="community-description"
                                    value={createDescription}
                                    onChange={(e) => setCreateDescription(e.target.value)}
                                    className="orbit-ring w-full rounded-xl border border-orbit-border/60 bg-orbit-surface px-3 py-2 text-sm text-orbit-text"
                                    rows={3}
                                    placeholder="What this community is about"
                                    disabled={creating}
                                />
                            </div>

                            {/* TEMP MVP: creation UI intentionally hides join mode.
                                New communities default to open server-side until invite-only UX is restored. */}

                            {createError ? (
                                <p className="text-xs text-orbit-warning">{createError}</p>
                            ) : null}

                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetCreateForm();
                                    }}
                                    className="orbit-btn-secondary min-h-[40px] rounded-lg px-4 py-2 text-sm"
                                    disabled={creating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="rounded-cta min-h-[40px] bg-action-primary px-4 py-2 text-sm font-semibold text-orbit-canvas shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {creating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
