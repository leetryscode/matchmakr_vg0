'use client';

import React from 'react';
import { SingleStatus, getStatusLabel, getStatusDescription, getStatusStyles } from '@/lib/status/singleStatus';

interface ManagedSingleCardProps {
    single: {
        id: string;
        name: string | null;
        sponsor_label: string | null;
    };
    onClick: () => void;
    status: SingleStatus;
    approvedMatchCount: number;
}

/**
 * Gets the display name for a single, prioritizing their real name over sponsor label
 */
function getDisplayName(name: string | null, sponsorLabel: string | null): string {
    // If single has set their own name and it's not empty, use that
    if (name && name.trim() !== '') {
        return name;
    }
    // Otherwise use sponsor label if available
    if (sponsorLabel && sponsorLabel.trim() !== '') {
        return sponsorLabel;
    }
    // Fallback
    return 'Invited single';
}

const ManagedSingleCard: React.FC<ManagedSingleCardProps> = ({ single, onClick, status, approvedMatchCount }) => {
    return (
        <div
            onClick={onClick}
            className="bg-background-card hover:bg-background-card/95 rounded-card-lg shadow-card hover:shadow-card-hover hover:-translate-y-[1px] active:translate-y-0 active:shadow-card transition-all duration-200 p-4 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-blue/50"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {/* Name row with chevron */}
            <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-semibold text-text-dark flex-1 pr-2">
                    {getDisplayName(single.name, single.sponsor_label)}
                </h3>
                {/* Right-facing chevron */}
                <svg 
                    width="20" 
                    height="20" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    viewBox="0 0 24 24"
                    className="text-text-light group-hover:text-primary-blue transition-colors flex-shrink-0"
                >
                    <polyline points="9,18 15,12 9,6" />
                </svg>
            </div>

            {/* Status chip row */}
            <div className="mb-2">
                <span className={getStatusStyles(status)}>
                    {getStatusLabel(status)}
                </span>
            </div>

            {/* Status description line */}
            <div className="type-meta">
                {getStatusDescription(status, approvedMatchCount)}
            </div>
        </div>
    );
};

export default ManagedSingleCard;

