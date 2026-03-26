'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import InviteSingleModal from './InviteSingleModal';
import DraftProfileWalkthrough from './DraftProfileWalkthrough';
import AnimatedGoldBorder from '@/components/ui/AnimatedGoldBorder';
import ImageCropper from '@/components/profile/ImageCropper';
import { Area } from 'react-easy-crop';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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

// ─── Image crop helper (same pipeline as PhotoGallery) ────────────────────────

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new window.Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob | null> {
    const image = await createImage(imageSrc);
    const cropX = Math.max(0, Math.round(pixelCrop.x));
    const cropY = Math.max(0, Math.round(pixelCrop.y));
    const cropW = Math.max(1, Math.round(pixelCrop.width));
    const cropH = Math.max(1, Math.round(pixelCrop.height));

    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    cropCtx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const OUTPUT_SIZE = 1080;
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return null;
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;
    outputCtx.imageSmoothingEnabled = true;
    outputCtx.imageSmoothingQuality = 'high';
    outputCtx.drawImage(cropCanvas, 0, 0, cropCanvas.width, cropCanvas.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    return new Promise((resolve) => {
        outputCanvas.toBlob(
            (file) => {
                cropCanvas.width = cropCanvas.height = 0;
                outputCanvas.width = outputCanvas.height = 0;
                resolve(file);
            },
            'image/jpeg',
            0.85
        );
    });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WelcomeCardInvite {
    id: string;
    invitee_label: string | null;
    hasDraftProfile: boolean;
}

interface SponsorWelcomeCardProps {
    userId: string;
    invites: WelcomeCardInvite[];
    hasPhoto: boolean;
    hasCommunities: boolean;
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
        <AnimatedGoldBorder borderRadius="17.5px">
        <div className="relative rounded-2xl border border-transparent bg-orbit-canvas px-5 py-6 overflow-hidden">
            {/* Gold tint overlay — must be a child element, not bg-orbit-gold/[0.04] on the card itself,
                because the parent (AnimatedGoldBorder) has the gradient background and a transparent
                card background would let it bleed through the entire card interior. */}
            <div className="absolute inset-0 bg-orbit-gold/[0.04] pointer-events-none" />

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
        </AnimatedGoldBorder>
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
    hasPhoto,
    hasCommunities,
    onPhotoUploadClick,
    isUploadingPhoto,
}: {
    invites: WelcomeCardInvite[];
    onInviteClick: () => void;
    hasPhoto: boolean;
    hasCommunities: boolean;
    onPhotoUploadClick: () => void;
    isUploadingPhoto: boolean;
}) {
    const incompleteDrafts = invites.filter(inv => !inv.hasDraftProfile);
    const firstIncomplete = incompleteDrafts[0];
    const statusLine = buildStatusLine(invites);

    const handleScrollToCommunities = () => {
        document.getElementById('my-communities')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Determine the one conditional action by priority
    let conditionalAction: React.ReactNode = null;
    if (!hasPhoto) {
        conditionalAction = (
            <button
                onClick={onPhotoUploadClick}
                disabled={isUploadingPhoto}
                className="w-full border border-orbit-gold/40 text-orbit-gold font-medium text-sm py-2.5 rounded-xl hover:bg-orbit-gold/10 active:bg-orbit-gold/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploadingPhoto ? 'Uploading\u2026' : 'Add your photo'}
            </button>
        );
    } else if (!hasCommunities) {
        conditionalAction = (
            <button
                onClick={handleScrollToCommunities}
                className="w-full border border-orbit-gold/40 text-orbit-gold font-medium text-sm py-2.5 rounded-xl hover:bg-orbit-gold/10 active:bg-orbit-gold/15 transition-colors"
            >
                Join your communities
            </button>
        );
    } else if (incompleteDrafts.length > 0 && firstIncomplete) {
        conditionalAction = (
            <Link
                href={`/dashboard/invite/${firstIncomplete.id}`}
                className="w-full border border-orbit-gold/20 text-orbit-text/70 font-medium text-sm py-2.5 rounded-xl hover:bg-orbit-gold/5 active:bg-orbit-gold/10 transition-colors text-center"
            >
                {incompleteDrafts.length === 1
                    ? `Finish ${firstIncomplete.invitee_label || 'their'}\u2019s profile`
                    : "Finish building your singles\u2019 profiles"}
            </Link>
        );
    }

    return (
        <AnimatedGoldBorder borderRadius="17.5px">
        <div className="relative rounded-2xl border border-transparent bg-orbit-canvas px-5 py-6 overflow-hidden">
            {/* Gold tint overlay — solid canvas base required; see State1 comment */}
            <div className="absolute inset-0 bg-orbit-gold/[0.04] pointer-events-none" />

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
                {/* Invite another single — always shown */}
                <button
                    onClick={onInviteClick}
                    className="w-full bg-orbit-gold text-orbit-canvas font-medium text-sm py-2.5 rounded-xl hover:opacity-90 active:opacity-80 transition-opacity"
                >
                    Invite another single
                </button>

                {/* One conditional action */}
                {conditionalAction}
            </div>
        </div>
        </AnimatedGoldBorder>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SponsorWelcomeCard({ userId, invites, hasPhoto: hasPhotoProp, hasCommunities }: SponsorWelcomeCardProps) {
    const supabase = createClient();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [walkthrough, setWalkthrough] = useState<{ inviteId: string; inviteeName: string | null } | null>(null);
    const [hasPhoto, setHasPhoto] = useState(hasPhotoProp);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInviteClick = () => setIsModalOpen(true);

    const handlePhotoUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setImageToCrop(reader.result as string);
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCropComplete = async (croppedAreaPixels: Area) => {
        if (!imageToCrop) return;
        setImageToCrop(null);
        setIsUploadingPhoto(true);
        try {
            const blob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            if (!blob) throw new Error('Could not crop image.');

            const fileName = `${Date.now()}.jpeg`;
            const filePath = `${userId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('profile_pictures')
                .upload(filePath, blob, { contentType: 'image/jpeg', upsert: false });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('profile_pictures')
                .getPublicUrl(filePath);

            // Fetch current photos to build updated array
            const { data: profile } = await supabase
                .from('profiles')
                .select('photos')
                .eq('id', userId)
                .single();
            const currentPhotos = (profile?.photos as string[] | null) ?? [];
            const updatedPhotos = [...currentPhotos, publicUrl];

            const { error: dbError } = await supabase
                .from('profiles')
                .update({ photos: updatedPhotos })
                .eq('id', userId);
            if (dbError) throw dbError;

            setHasPhoto(true);
            router.refresh();
        } catch (err: any) {
            alert(err.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    return (
        <>
            {invites.length === 0 ? (
                <WelcomeCardState1 onInviteClick={handleInviteClick} />
            ) : (
                <WelcomeCardState2
                    invites={invites}
                    onInviteClick={handleInviteClick}
                    hasPhoto={hasPhoto}
                    hasCommunities={hasCommunities}
                    onPhotoUploadClick={handlePhotoUploadClick}
                    isUploadingPhoto={isUploadingPhoto}
                />
            )}

            {/* Hidden file input for photo upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Image crop modal */}
            {imageToCrop && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-orbit-canvas/80 backdrop-blur-[2px] p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-orbit-surface-2 shadow-xl ring-1 ring-orbit-border/20">
                        <div className="p-5 sm:p-6">
                            <ImageCropper
                                image={imageToCrop}
                                onCropComplete={handleCropComplete}
                                onClose={() => setImageToCrop(null)}
                            />
                        </div>
                    </div>
                </div>
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
