'use client';

import React from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';

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
        <div className="relative w-full bg-white/10 rounded-card-lg border border-white/20 shadow-card p-4 flex items-center gap-4">
            {/* X button - absolutely positioned, subtle overlay */}
            <button
                onClick={onDismiss}
                disabled={isProcessing}
                className="absolute top-2 right-2 text-white/30 hover:text-white/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1 z-10"
                aria-label="Dismiss"
            >
                <XMarkIcon className="w-3.5 h-3.5" />
            </button>

            {/* Left: Larger rounded-rectangle image - dominant visual element */}
            <div className="flex-shrink-0">
                <div className="relative w-22 h-22 rounded-[18px] overflow-hidden border border-white/20 bg-gray-100" style={{ width: '88px', height: '88px' }}>
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
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                            ?
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Content and actions - vertically centered relative to image */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* Actions - stacked vertically, narrower, quieter */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onNotSureYet}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-white/80 bg-white/5 hover:bg-white/8 border border-white/15 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-w-[160px]"
                    >
                        I'm not sure yet
                    </button>
                    <button
                        onClick={onOpenToIt}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-white/80 bg-white/5 hover:bg-white/8 border border-white/15 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-w-[160px]"
                    >
                        I'm open to it
                    </button>
                </div>
            </div>
        </div>
    );
}

