'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import InviteSingleModal from './InviteSingleModal';
import DraftProfileWalkthrough from './DraftProfileWalkthrough';

const QUOTES = [
    {
        text: "He's been my best friend since we were kids. He's a chef who actually loves cooking for people even after a long shift — that's just the kind of person he is. He's the first one I call when I need a reality check because he's honest but always kind.",
        attribution: 'Frank, from his friend\u2019s Orbit profile',
    },
    {
        text: "She's the friend who remembers everyone's birthday. Terrible at picking restaurants but somehow always finds the best wine on the menu. Looking for someone who can keep up with her but knows when to slow down.",
        attribution: 'Elena, from her friend\u2019s Orbit profile',
    },
    {
        text: "Funniest person in any room but he'd never tell you that himself. Works in emergency medicine so his schedule is chaos, but when he's there, he's all in. Needs someone who gets that and doesn't take it personally.",
        attribution: 'Marcus, from his friend\u2019s Orbit profile',
    },
    {
        text: "My college roommate. She moved here two years ago and knows everyone at the farmer's market by name but hasn't met the right person yet. She deserves someone as thoughtful as she is — she still writes handwritten thank you notes.",
        attribution: 'Priya, from her friend\u2019s Orbit profile',
    },
] as const;

const AUTO_ADVANCE_MS = 16000;
const SWIPE_THRESHOLD = 40;

interface WelcomeCardInvite {
    id: string;
    invitee_label: string | null;
    hasDraftProfile: boolean;
}

interface SponsorWelcomeCardProps {
    userId: string;
    invites: WelcomeCardInvite[];
}

// ─── State 1: No invites yet ──────────────────────────────────────────────────

function WelcomeCardState1({
    onInviteClick,
}: {
    onInviteClick: () => void;
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const touchStartX = useRef<number | null>(null);

    const goTo = useCallback((index: number) => {
        setIsVisible(false);
        setTimeout(() => {
            setActiveIndex(index);
            setIsVisible(true);
        }, 200);
    }, []);

    const handleDotClick = (index: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        goTo(index);
        timerRef.current = setInterval(() => {
            setActiveIndex(prev => {
                const next = (prev + 1) % QUOTES.length;
                setIsVisible(false);
                setTimeout(() => {
                    setActiveIndex(next);
                    setIsVisible(true);
                }, 200);
                return prev;
            });
        }, AUTO_ADVANCE_MS);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < SWIPE_THRESHOLD) return;

        if (timerRef.current) clearInterval(timerRef.current);
        const direction = delta < 0 ? 1 : -1;
        const next = (activeIndex + direction + QUOTES.length) % QUOTES.length;
        goTo(next);
        timerRef.current = setInterval(() => {
            setActiveIndex(prev => {
                const next2 = (prev + 1) % QUOTES.length;
                setIsVisible(false);
                setTimeout(() => {
                    setActiveIndex(next2);
                    setIsVisible(true);
                }, 200);
                return prev;
            });
        }, AUTO_ADVANCE_MS);
    };

    // Auto-advance
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setActiveIndex(prev => {
                const next = (prev + 1) % QUOTES.length;
                setIsVisible(false);
                setTimeout(() => {
                    setActiveIndex(next);
                    setIsVisible(true);
                }, 200);
                return prev;
            });
        }, AUTO_ADVANCE_MS);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const quote = QUOTES[activeIndex];

    return (
        <div className="relative rounded-2xl border border-orbit-gold/20 bg-orbit-gold/[0.04] px-5 py-6 overflow-hidden">
            {/* Decorative top accent line */}
            <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                    background: 'linear-gradient(to right, rgb(var(--orbit-gold) / 0.55), rgb(var(--orbit-gold) / 0))',
                }}
            />

            {/* Section label */}
            <p className="text-orbit-gold/60 text-[10px] uppercase tracking-widest font-medium mb-4">
                How a sponsor introduces someone on Orbit
            </p>

            {/* Quote carousel */}
            <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative h-[14rem] select-none"
            >
                <div
                    className="transition-opacity duration-200"
                    style={{ opacity: isVisible ? 1 : 0 }}
                >
                    {/* Opening quote mark */}
                    <span
                        className="absolute -top-1 -left-1 text-[52px] leading-none text-orbit-gold/20 pointer-events-none"
                        style={{ fontFamily: 'Georgia, serif' }}
                        aria-hidden="true"
                    >
                        &ldquo;
                    </span>

                    {/* Quote text */}
                    <p className="text-orbit-text/80 italic text-sm leading-relaxed px-5 pt-3">
                        {quote.text}
                    </p>

                    {/* Closing quote mark */}
                    <span
                        className="inline-block text-[52px] leading-none text-orbit-gold/20 pointer-events-none float-right -mt-3 -mr-1"
                        style={{ fontFamily: 'Georgia, serif' }}
                        aria-hidden="true"
                    >
                        &rdquo;
                    </span>

                    {/* Attribution */}
                    <p className="text-orbit-muted text-xs text-right mt-3 clear-both pr-1">
                        — {quote.attribution}
                    </p>
                </div>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-4" role="tablist" aria-label="Quote slides">
                {QUOTES.map((_, i) => (
                    <button
                        key={i}
                        role="tab"
                        aria-selected={i === activeIndex}
                        aria-label={`Quote ${i + 1}`}
                        onClick={() => handleDotClick(i)}
                        className={`w-[6px] h-[6px] rounded-full transition-all duration-200 ${
                            i === activeIndex
                                ? 'bg-orbit-gold scale-110'
                                : 'bg-orbit-gold/20 hover:bg-orbit-gold/40'
                        }`}
                    />
                ))}
            </div>

            {/* Divider */}
            <div className="border-t border-orbit-gold/10 mt-5 mb-4" />

            {/* Provocation text */}
            <p className="text-orbit-text font-medium text-base mb-4">
                You already know who you&apos;d introduce first.
            </p>

            {/* CTA button */}
            <button
                onClick={onInviteClick}
                className="w-full bg-orbit-gold text-orbit-canvas font-medium text-sm py-2.5 rounded-xl hover:opacity-90 active:opacity-80 transition-opacity"
            >
                Invite them to your Orbit
            </button>
        </div>
    );
}

// ─── State 2: Has invites ─────────────────────────────────────────────────────

function buildStatusLine(invites: WelcomeCardInvite[]): string {
    const names = invites.map(inv => inv.invitee_label || 'Your single');
    if (names.length === 1) {
        return `${names[0]}'s invite is pending — we'll notify you when they join.`;
    } else if (names.length === 2) {
        return `${names[0]} and ${names[1]}'s invites are pending — we'll notify you as they join.`;
    } else {
        return `${names[0]}, ${names[1]}, and ${names.length - 2} more — we'll notify you as they join.`;
    }
}

function WelcomeCardState2({
    invites,
    onInviteClick,
}: {
    invites: WelcomeCardInvite[];
    onInviteClick: () => void;
}) {
    const incompleteDrafts = invites.filter(inv => !inv.hasDraftProfile);
    const firstIncomplete = incompleteDrafts[0];
    const statusLine = buildStatusLine(invites);

    const handleScrollToCommunities = () => {
        document.getElementById('my-communities')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="relative rounded-2xl border border-orbit-gold/20 bg-orbit-gold/[0.04] px-5 py-6 overflow-hidden">
            {/* Decorative top accent line */}
            <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                    background: 'linear-gradient(to right, rgb(var(--orbit-gold) / 0.55), rgb(var(--orbit-gold) / 0))',
                }}
            />

            {/* Status section */}
            <p className="text-orbit-gold/60 text-[10px] uppercase tracking-widest font-medium mb-3">
                Status
            </p>
            <p className="text-orbit-text/80 text-sm leading-relaxed mb-5">
                {statusLine}
            </p>

            {/* Divider */}
            <div className="border-t border-orbit-gold/10 mb-4" />

            {/* Actions */}
            <div className="flex flex-col gap-3">
                {/* Invite another single */}
                <button
                    onClick={onInviteClick}
                    className="w-full bg-orbit-gold text-orbit-canvas font-medium text-sm py-2.5 rounded-xl hover:opacity-90 active:opacity-80 transition-opacity"
                >
                    Invite another single
                </button>

                {/* Join communities */}
                <button
                    onClick={handleScrollToCommunities}
                    className="w-full border border-orbit-gold/40 text-orbit-gold font-medium text-sm py-2.5 rounded-xl hover:bg-orbit-gold/10 active:bg-orbit-gold/15 transition-colors"
                >
                    Join your communities
                </button>

                {/* Finish draft profile (conditional) */}
                {incompleteDrafts.length > 0 && firstIncomplete && (
                    <Link
                        href={`/dashboard/invite/${firstIncomplete.id}`}
                        className="w-full border border-orbit-gold/20 text-orbit-text/70 font-medium text-sm py-2.5 rounded-xl hover:bg-orbit-gold/5 active:bg-orbit-gold/10 transition-colors text-center"
                    >
                        {incompleteDrafts.length === 1
                            ? `Finish ${firstIncomplete.invitee_label || 'their'}\u2019s profile`
                            : "Finish building your singles\u2019 profiles"}
                    </Link>
                )}
            </div>
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SponsorWelcomeCard({ userId, invites }: SponsorWelcomeCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [walkthrough, setWalkthrough] = useState<{ inviteId: string; inviteeName: string | null } | null>(null);

    const handleInviteClick = () => setIsModalOpen(true);

    return (
        <>
            {invites.length === 0 ? (
                <WelcomeCardState1 onInviteClick={handleInviteClick} />
            ) : (
                <WelcomeCardState2 invites={invites} onInviteClick={handleInviteClick} />
            )}

            <InviteSingleModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onNewSingleInvited={(inviteId, inviteeName) => {
                    setIsModalOpen(false);
                    setWalkthrough({ inviteId, inviteeName });
                }}
            />

            {walkthrough && (
                <DraftProfileWalkthrough
                    inviteId={walkthrough.inviteId}
                    inviteeName={walkthrough.inviteeName}
                    userId={userId}
                    onClose={() => setWalkthrough(null)}
                />
            )}
        </>
    );
}
