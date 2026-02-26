'use client';

import React from 'react';
import { getStatusStyles } from '@/lib/status/singleStatus';

interface TemplateManagedSingleCardProps {
    onInviteClick: () => void;
}

const TemplateManagedSingleCard: React.FC<TemplateManagedSingleCardProps> = ({ onInviteClick }) => {
    return (
        <div
            onClick={onInviteClick}
            className="orbit-card hover:shadow-card-hover hover:-translate-y-[1px] active:translate-y-0 active:shadow-card transition-all duration-200 p-4 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-blue/50"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onInviteClick();
                }
            }}
        >
            {/* Name row with chevron */}
            <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-semibold text-text-dark flex-1 pr-2">
                    Invite Single →
                </h3>
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

            {/* Status pill row */}
            <div className="mb-2">
                <span className={`${getStatusStyles('IN_MOTION')} animate-pulse`}>
                    Start here
                </span>
            </div>

            {/* Subtext */}
            <div className="type-meta orbit-muted">
                Add your first single to access introductions
            </div>
        </div>
    );
};

export default TemplateManagedSingleCard;
