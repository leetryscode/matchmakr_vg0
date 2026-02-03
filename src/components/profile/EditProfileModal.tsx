import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearPondCache } from '@/lib/pond-cache';
import { Profile } from './types';

interface EditProfileModalProps {
    profile: Profile;
    onClose: () => void;
    onSave: () => void;
    canEditEndorsementOnly?: boolean;
    singleBasicInfoOnly?: boolean;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onClose, onSave, canEditEndorsementOnly = false, singleBasicInfoOnly = false }) => {
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
            
            // Build payload based on mode
            let payload: Record<string, any> = { 
                name, 
                occupation,
            };
            
            // Only include bio if not in singleBasicInfoOnly mode
            if (!singleBasicInfoOnly) {
                payload.bio = bio;
            }
            
            // Include location fields for SINGLE profiles
            if (profile.user_type === 'SINGLE') {
                payload.city = cleanCity;
                payload.state = cleanState;
                payload.zip_code = cleanZip;
            }
            
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
        clearPondCache();
        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white/95 rounded-2xl p-6 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto text-center shadow-xl border border-white/20">
                {canEditEndorsementOnly ? (
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">Edit endorsement</h2>
                            <p className="text-sm text-gray-500">Help others understand why you're vouching.</p>
                        </div>
                    </div>
                ) : (
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Profile</h2>
                )}
                {canEditEndorsementOnly ? (
                    <>
                        <div className="mb-3 text-sm text-gray-600 max-w-md">
                            <p>Share what makes {profile.name || 'them'} a great person to date. A specific trait or example works better than a general compliment.</p>
                        </div>
                        <textarea
                            value={endorsement}
                            onChange={e => setEndorsement(e.target.value)}
                            className="w-full min-h-[220px] md:min-h-[260px] rounded-xl border border-gray-200 bg-white px-4 py-3 mb-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-teal-light resize-none"
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
                            {!singleBasicInfoOnly && (
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
                            )}
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
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-full font-semibold transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="rounded-cta min-h-[44px] px-5 py-2 bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal; 