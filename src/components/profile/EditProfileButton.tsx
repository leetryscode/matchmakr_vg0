'use client';

import React, { useState } from 'react';
import EditProfileModal from './EditProfileModal';
import { type Profile } from './types'; // Assuming you have a types file

export default function EditProfileButton({ profile, canEditEndorsementOnly = false, onSave }: { profile: Profile, canEditEndorsementOnly?: boolean, onSave?: () => void }) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleSave = () => {
        setIsEditModalOpen(false);
        if (onSave) {
            onSave();
        } else {
            window.location.reload();
        }
    };

    return (
        <>
            <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-white/20 border border-white/40 text-white shadow-card backdrop-blur-sm hover:bg-white/40 hover:text-primary-blue transition-colors"
            >
                Edit
            </button>
            {isEditModalOpen && (
                <EditProfileModal
                    profile={profile}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSave}
                    canEditEndorsementOnly={canEditEndorsementOnly}
                />
            )}
        </>
    );
} 