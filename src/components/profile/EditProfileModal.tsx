import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from './types';

interface EditProfileModalProps {
    profile: Profile;
    onClose: () => void;
    onSave: () => void;
    canEditEndorsementOnly?: boolean;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onClose, onSave, canEditEndorsementOnly = false }) => {
    const supabase = createClient();
    const [name, setName] = useState('');
    const [occupation, setOccupation] = useState('');
    const [bio, setBio] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [endorsement, setEndorsement] = useState(profile.matchmakr_endorsement || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setOccupation(profile.occupation || '');
            setBio(profile.bio || '');
            setCity(profile.city || '');
            setState(profile.state || '');
            setZipCode(profile.zip_code || '');
        }
    }, [profile]);

    const handleSave = async () => {
        setIsSaving(true);
        let error;
        if (canEditEndorsementOnly) {
            const payload = { matchmakr_endorsement: endorsement };
            console.log('Attempting to update endorsement for profile:', profile);
            console.log('Payload:', payload);
            const result = await supabase
                .from('profiles')
                .update(payload)
                .eq('id', profile.id);
            error = result.error;
            console.log('Supabase result:', result);
        } else {
            // Convert empty fields to null
            const cleanCity = city.trim() === '' ? null : city;
            const cleanState = state.trim() === '' ? null : state;
            const cleanZip = zipCode.trim() === '' ? null : zipCode;
            const payload = { 
                name, 
                occupation, 
                bio,
                ...(profile.user_type === 'SINGLE' && { city: cleanCity, state: cleanState, zip_code: cleanZip })
            };
            console.log('Attempting to update profile:', profile);
            console.log('Payload:', payload);
            const result = await supabase
                .from('profiles')
                .update(payload)
                .eq('id', profile.id);
            error = result.error;
            console.log('Supabase result:', result);
        }
        setIsSaving(false);
        if (error) {
            alert(error.message);
            return;
        }
        // Invalidate pond cache after successful save
        if (typeof window !== 'undefined') {
            localStorage.removeItem('pond_cache');
        }
        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-background-card rounded-lg p-8 w-full max-w-md text-center shadow-xl border border-gray-200">
                <h2 className="text-2xl font-light mb-4 text-primary-blue tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>
                    {canEditEndorsementOnly ? 'Edit Your Endorsement' : 'Edit Profile'}
                </h2>
                {canEditEndorsementOnly ? (
                    <>
                        <textarea
                            value={endorsement}
                            onChange={e => setEndorsement(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 text-gray-800 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                            rows={5}
                            placeholder="Write your endorsement..."
                        />
                    </>
                ) : (
                    <>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-background-card text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                                />
                            </div>
                            <div>
                                <label htmlFor="occupation" className="block text-sm font-medium text-gray-700">Occupation</label>
                                <input
                                    type="text"
                                    id="occupation"
                                    value={occupation}
                                    onChange={(e) => setOccupation(e.target.value)}
                                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-background-card text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                                />
                            </div>
                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">About Me</label>
                                <textarea
                                    id="bio"
                                    rows={4}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-background-card text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                                />
                            </div>
                            {profile.user_type === 'SINGLE' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                                            <input
                                                type="text"
                                                id="city"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-background-card text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                                                placeholder="e.g., New York"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="state" className="block text-sm font-medium text-gray-700">State</label>
                                            <input
                                                type="text"
                                                id="state"
                                                value={state}
                                                onChange={(e) => setState(e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-background-card text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                                                placeholder="e.g., NY"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">ZIP Code (optional)</label>
                                        <input
                                            type="text"
                                            id="zipCode"
                                            value={zipCode}
                                            onChange={(e) => setZipCode(e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-background-card text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                                            placeholder="e.g., 10001"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
                <div className="flex justify-center gap-4 mt-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 bg-primary-blue text-white rounded-md hover:bg-primary-blue-light font-semibold transition-colors">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal; 