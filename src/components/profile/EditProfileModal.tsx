import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Profile {
    id: string;
    name: string | null;
    occupation: string | null;
    bio: string | null;
}

interface EditProfileModalProps {
    profile: Profile;
    onClose: () => void;
    onSave: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onClose, onSave }) => {
    const supabase = createClient();
    const [name, setName] = useState('');
    const [occupation, setOccupation] = useState('');
    const [bio, setBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setOccupation(profile.occupation || '');
            setBio(profile.bio || '');
        }
    }, [profile]);

    const handleSave = async () => {
        setIsSaving(true);
        const { error } = await supabase
            .from('profiles')
            .update({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                occupation,
                bio: bio,
            })
            .eq('id', profile.id);
        
        setIsSaving(false);
        if (error) {
            alert('Error updating profile: ' + error.message);
        } else {
            onSave();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Profile</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="occupation" className="block text-sm font-medium text-gray-700">Occupation</label>
                        <input
                            type="text"
                            id="occupation"
                            value={occupation}
                            onChange={(e) => setOccupation(e.target.value)}
                             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">About Me</label>
                        <textarea
                            id="bio"
                            rows={4}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                    </div>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-500 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal; 