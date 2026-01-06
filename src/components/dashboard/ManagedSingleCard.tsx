'use client';

import React from 'react';

interface ManagedSingleCardProps {
    single: {
        id: string;
        name: string | null;
    };
    onClick: () => void;
    status?: 'active' | 'invite_pending' | 'paused'; // Optional status prop for future use
}

const ManagedSingleCard: React.FC<ManagedSingleCardProps> = ({ single, onClick, status = 'active' }) => {
    // Get status chip styling based on status
    const getStatusStyles = () => {
        switch (status) {
            case 'active':
                return 'bg-green-500/15 text-green-300 border-green-500/20';
            case 'invite_pending':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'paused':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default:
                return 'bg-white/10 text-white/90 border-white/10';
        }
    };

    const getStatusLabel = () => {
        switch (status) {
            case 'active':
                return 'Active';
            case 'invite_pending':
                return 'Invite pending';
            case 'paused':
                return 'Paused';
            default:
                return 'Active';
        }
    };
    return (
        <div
            onClick={onClick}
            className="bg-white/5 hover:bg-white/10 rounded-card-lg border border-white/10 hover:border-white/20 shadow-card hover:shadow-card-hover transition-all duration-200 p-4 group cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white"
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
                <h3 className="text-base font-semibold text-white/90 flex-1 pr-2">
                    {single.name || 'Unnamed'}
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
                    className="text-white/95 group-hover:text-white transition-colors flex-shrink-0"
                >
                    <polyline points="9,18 15,12 9,6" />
                </svg>
            </div>

            {/* Status chip row */}
            <div className="mb-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border uppercase tracking-wide ${getStatusStyles()}`}>
                    {getStatusLabel()}
                </span>
            </div>

            {/* Match state line */}
            <div className="type-meta text-white/60">
                0 unopened matches
            </div>
        </div>
    );
};

export default ManagedSingleCard;

