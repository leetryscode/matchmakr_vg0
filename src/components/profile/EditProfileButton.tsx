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
                className="px-3 py-1 text-sm font-semibold rounded-md border-2 gradient-border bg-transparent text-primary-blue hover:text-white hover:bg-gradient-primary transition-colors"
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