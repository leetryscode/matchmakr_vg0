'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SectionHeader from '@/components/ui/SectionHeader';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getPreviewResponseStatusStyles, getPreviewResponseCapsuleBorder, type PreviewResponseStatus } from '@/lib/status/singleStatus';
import { createClient } from '@/lib/supabase/client';

interface SneakPeek {
    id: string;
    recipient_single_id: string;
    target_single_id: string;
    photo_url: string;
    status: 'PENDING' | 'OPEN_TO_IT' | 'NOT_SURE_YET' | 'DISMISSED' | 'EXPIRED';
    created_at: string;
    expires_at: string;
    responded_at: string | null;
}

interface SponsoredSingle {
    id: string;
    name: string | null;
    profile_pic_url: string | null;
}

interface SneakPeeksSectionProps {
    sponsorId: string;
    sponsoredSingles: SponsoredSingle[];
}

// Example preview card for empty state - matches pair-capsule style (transparent, bordered)
const ExamplePreviewCard = () => {
    return (
        <div className="relative w-full bg-transparent border border-orbit-border/50 rounded-2xl p-3 flex items-center gap-3 opacity-80 pointer-events-none" style={{ maxWidth: '90%' }}>
            {/* X button - absolutely positioned, subtle overlay */}
            <div className="absolute top-2 right-2 orbit-muted opacity-50 p-1">
                <XMarkIcon className="w-3 h-3" />
            </div>

            {/* Left: Smaller rounded-rectangle image - matches real preview structure */}
            <div className="flex-shrink-0">
                <div className="relative rounded-[18px] overflow-hidden orbit-surface" style={{ width: '64px', height: '64px' }}>
                    {/* Generic placeholder - simple outline person */}
                    <div className="w-full h-full flex items-center justify-center orbit-surface">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="orbit-muted">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    {/* Radial vignette overlay */}
                    <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.12) 100%)',
                            backdropFilter: 'blur(0.5px)',
                        }}
                    />
                </div>
            </div>

            {/* Right: Content and actions - matches real preview structure */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* Actions - stacked vertically, narrower, quieter - matches real preview */}
                <div className="flex flex-col gap-1.5">
                    <div className="px-4 py-2 orbit-muted orbit-surface rounded-lg text-xs max-w-[140px] shadow-sm">
                        I'm not sure yet
                    </div>
                    <div className="px-4 py-2 orbit-muted orbit-surface rounded-lg text-xs max-w-[140px] shadow-sm">
                        I'm open to it
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sponsor sneak peek card
interface SneakPeekCardProps {
    sneakPeek: SneakPeek;
    targetName: string | null;
    recipientName: string | null;
    recipientAvatarUrl: string | null;
    onClick: () => void;
    onArchive: () => void;
    isArchiving: boolean;
}

const SneakPeekCard: React.FC<SneakPeekCardProps> = ({ sneakPeek, targetName, recipientName, recipientAvatarUrl, onClick, onArchive, isArchiving }) => {
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'Awaiting response';
            case 'OPEN_TO_IT':
                return 'Open to it';
            case 'NOT_SURE_YET':
                return 'Not sure yet';
            default:
                return status;
        }
    };

    const handleArchiveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onArchive();
    };

    return (
        <div
            className={`flex items-center gap-0.5 w-full transition-all`}
            style={{ transitionDuration: isArchiving ? '200ms' : '150ms' }}
        >
            {/* Capsule: left avatar + names + status pill + right avatar — tinted outline matches status */}
            <div
                onClick={onClick}
                className={`flex-1 flex items-center gap-4 px-4 py-3 bg-transparent rounded-full min-w-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orbit-gold/50 ${
                    ['PENDING', 'OPEN_TO_IT', 'NOT_SURE_YET'].includes(sneakPeek.status)
                        ? getPreviewResponseCapsuleBorder(sneakPeek.status as PreviewResponseStatus)
                        : 'border border-orbit-border/50'
                } ${
                    isArchiving ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick();
                    }
                }}
            >
                {/* Left: Single avatar (48px) */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center orbit-surface overflow-hidden flex-shrink-0">
                    {recipientAvatarUrl ? (
                        <Image
                            src={recipientAvatarUrl}
                            alt={recipientName || 'Recipient'}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-orbit-text text-base font-bold">
                            {recipientName?.charAt(0).toUpperCase() || '?'}
                        </span>
                    )}
                </div>

                {/* Center: Names + status pill (primary metadata) */}
                <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-orbit-text font-semibold whitespace-nowrap">
                            {recipientName || 'Your single'}
                        </span>
                        <span className="orbit-muted">·</span>
                        <span className="orbit-muted truncate min-w-0">
                            {targetName || 'Someone'}
                        </span>
                    </div>
                    {['PENDING', 'OPEN_TO_IT', 'NOT_SURE_YET'].includes(sneakPeek.status) && (
                        <span className={`${getPreviewResponseStatusStyles(sneakPeek.status as PreviewResponseStatus)} mt-1.5 -translate-y-[2px] whitespace-nowrap`}>
                            {getStatusLabel(sneakPeek.status)}
                        </span>
                    )}
                </div>

                {/* Right: Match avatar (48px) */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center orbit-surface overflow-hidden flex-shrink-0 opacity-90">
                    {sneakPeek.photo_url ? (
                        <Image
                            src={sneakPeek.photo_url}
                            alt={targetName || 'Target'}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-orbit-text text-base font-bold">
                            {targetName?.charAt(0).toUpperCase() || '?'}
                        </span>
                    )}
                </div>
            </div>

            {/* Per-item X — outside capsule, in gutter */}
            <button
                onClick={handleArchiveClick}
                className="w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center rounded-lg orbit-muted hover:bg-orbit-border/20 hover:text-orbit-text active:bg-orbit-border/30 transition-colors flex-shrink-0"
                aria-label="Dismiss"
                tabIndex={-1}
            >
                <XMarkIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export default function SneakPeeksSection({ sponsorId, sponsoredSingles }: SneakPeeksSectionProps) {
    const router = useRouter();
    const [sneakPeeks, setSneakPeeks] = useState<SneakPeek[]>([]);
    const [targetNames, setTargetNames] = useState<Record<string, string | null>>({});
    const [loading, setLoading] = useState(true);
    const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
    const [animatingOutIds, setAnimatingOutIds] = useState<Set<string>>(new Set());

    // Fetch sneak peeks
    useEffect(() => {
        const fetchSneakPeeks = async () => {
            try {
                const response = await fetch(`/api/sneak-peeks?for=sponsor&sponsorId=${sponsorId}`);
                const data = await response.json();
                
                if (data.success && data.sneakPeeks) {
                    // Filter out DISMISSED and EXPIRED
                    const filtered = data.sneakPeeks.filter((sp: SneakPeek) => 
                        sp.status !== 'DISMISSED' && sp.status !== 'EXPIRED'
                    );
                    setSneakPeeks(filtered);

                    // Fetch target single names
                    const targetIds = [...new Set(filtered.map((sp: SneakPeek) => sp.target_single_id))];
                    if (targetIds.length > 0) {
                        const supabase = createClient();
                        const { data: profiles } = await supabase
                            .from('profiles')
                            .select('id, name')
                            .in('id', targetIds);
                        
                        const nameMap: Record<string, string | null> = {};
                        profiles?.forEach(profile => {
                            nameMap[profile.id] = profile.name;
                        });
                        setTargetNames(nameMap);
                    }
                }
            } catch (error) {
                console.error('Error fetching sneak peeks:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSneakPeeks();
    }, [sponsorId]);

    const handleCardClick = (targetSingleId: string) => {
        router.push(`/profile/${targetSingleId}`);
    };

    const handleArchive = (sneakPeekId: string) => {
        // Start fade-out animation
        setAnimatingOutIds(prev => new Set(prev).add(sneakPeekId));
        
        // After animation completes, remove from list
        setTimeout(() => {
            setArchivedIds(prev => new Set(prev).add(sneakPeekId));
            setAnimatingOutIds(prev => {
                const next = new Set(prev);
                next.delete(sneakPeekId);
                return next;
            });
        }, 200);
    };

    // Create recipient name and avatar maps
    const recipientNameMap: Record<string, string | null> = {};
    const recipientAvatarMap: Record<string, string | null> = {};
    sponsoredSingles.forEach(single => {
        recipientNameMap[single.id] = single.name;
        recipientAvatarMap[single.id] = single.profile_pic_url;
    });

    // Filter out archived items
    const visibleSneakPeeks = sneakPeeks.filter(sp => !archivedIds.has(sp.id));

    return (
        <div>
            <div className="mb-3 mt-8 first:mt-0">
                <h2 className="type-section text-orbit-text">
                    Preview responses
                </h2>
            </div>
            
            {loading ? (
                <div className="orbit-muted text-sm">Loading...</div>
            ) : visibleSneakPeeks.length === 0 ? (
                <div className="mt-4 orbit-card px-6 py-5">
                    <div className="mb-3">
                        <p className="text-xs orbit-muted">No previews sent yet. This is what your single will see:</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <ExamplePreviewCard />
                    </div>
                </div>
            ) : (
                <div className="mt-4 px-2 py-4">
                    <div className="flex flex-col space-y-3">
                        {visibleSneakPeeks.map((sneakPeek) => (
                            <SneakPeekCard
                                key={sneakPeek.id}
                                sneakPeek={sneakPeek}
                                targetName={targetNames[sneakPeek.target_single_id] || null}
                                recipientName={recipientNameMap[sneakPeek.recipient_single_id] || null}
                                recipientAvatarUrl={recipientAvatarMap[sneakPeek.recipient_single_id] || null}
                                onClick={() => handleCardClick(sneakPeek.target_single_id)}
                                onArchive={() => handleArchive(sneakPeek.id)}
                                isArchiving={animatingOutIds.has(sneakPeek.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

