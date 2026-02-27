'use client';

import React from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getPreviewOptionPillClasses } from '@/lib/status/singleStatus';

interface PreviewCardProps {
    id: string;
    photoUrl: string;
    onOpenToIt: () => void;
    onNotSureYet: () => void;
    onDismiss: () => void;
    isProcessing?: boolean;
}

export default function PreviewCard({
    id,
    photoUrl,
    onOpenToIt,
    onNotSureYet,
    onDismiss,
    isProcessing = false
}: PreviewCardProps) {
    return (
        <div className="relative w-full orbit-card p-4 flex items-center gap-4">
            {/* X button - absolutely positioned, subtle overlay */}
            <button
                onClick={onDismiss}
                disabled={isProcessing}
                className="absolute top-2 right-2 orbit-muted hover:text-orbit-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1 z-10"
                aria-label="Dismiss"
            >
                <XMarkIcon className="w-3.5 h-3.5" />
            </button>

            {/* Left: Larger rounded-rectangle image - dominant visual element */}
            <div className="flex-shrink-0">
                <div className="relative w-22 h-22 rounded-[18px] overflow-hidden orbit-surface-soft border border-orbit-border/30" style={{ width: '88px', height: '88px' }}>
                    {photoUrl ? (
                        <>
                            <Image
                                src={photoUrl}
                                alt="Preview"
                                width={88}
                                height={88}
                                className="w-full h-full object-cover"
                            />
                            {/* Radial vignette overlay - subtle edge blur, doesn't affect center */}
                            <div 
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.12) 100%)',
                                    backdropFilter: 'blur(0.5px)',
                                }}
                            />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold orbit-muted">
                            ?
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Content and actions - vertically centered relative to image */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* Actions - stacked vertically, narrower, quieter, less button-like */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onNotSureYet}
                        disabled={isProcessing}
                        className={`${getPreviewOptionPillClasses('NOT_SURE_YET')} hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-w-[160px]`}
                    >
                        I'm not sure yet
                    </button>
                    <button
                        onClick={onOpenToIt}
                        disabled={isProcessing}
                        className={`${getPreviewOptionPillClasses('OPEN_TO_IT')} hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-w-[160px]`}
                    >
                        I'm open to it
                    </button>
                </div>
            </div>
        </div>
    );
}

