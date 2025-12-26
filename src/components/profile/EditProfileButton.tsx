'use client';

import React, { useState } from 'react';
import EditProfileModal from './EditProfileModal';
import { type Profile } from './types'; // Assuming you have a types file

export default function EditProfileButton({ profile, canEditEndorsementOnly = false, singleBasicInfoOnly = false, onSave }: { profile: Profile, canEditEndorsementOnly?: boolean, singleBasicInfoOnly?: boolean, onSave?: () => void }) {
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
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-gray-100 border border-border-light text-text-dark shadow-card hover:bg-gray-200 hover:text-primary-blue transition-colors"
            >
                Edit
            </button>
            {isEditModalOpen && (
                <EditProfileModal
                    profile={profile}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSave}
                    canEditEndorsementOnly={canEditEndorsementOnly}
                    singleBasicInfoOnly={singleBasicInfoOnly}
                />
            )}
        </>
    );
} 