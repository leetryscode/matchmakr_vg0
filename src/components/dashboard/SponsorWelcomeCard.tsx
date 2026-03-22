'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import InviteSingleModal from './InviteSingleModal';

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

export default function SponsorWelcomeCard() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true); // crossfade state
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const touchStartX = useRef<number | null>(null);

    const goTo = useCallback((index: number) => {
        setIsVisible(false);
        setTimeout(() => {
            setActiveIndex(index);
            setIsVisible(true);
        }, 200);
    }, []);

    const advance = useCallback((direction: 1 | -1) => {
        setActiveIndex(prev => {
            const next = (prev + direction + QUOTES.length) % QUOTES.length;
            goTo(next);
            return prev; // goTo handles the update
        });
    }, [goTo]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            goTo((activeIndex + 1) % QUOTES.length);
        }, AUTO_ADVANCE_MS);
    }, [activeIndex, goTo]);

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
    }, []); // intentionally empty — the interval captures nothing from closure

    const handleDotClick = (index: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        goTo(index);
        // Restart timer after manual navigation
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

    void advance; // suppress unused warning — kept for potential future use
    void resetTimer;

    const quote = QUOTES[activeIndex];

    return (
        <>
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
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-orbit-gold text-orbit-canvas font-medium text-sm py-2.5 rounded-xl hover:opacity-90 active:opacity-80 transition-opacity"
                >
                    Invite them to your Orbit
                </button>
            </div>

            <InviteSingleModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
