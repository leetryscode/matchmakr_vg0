'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PhotoGallery from '@/components/profile/PhotoGallery';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { useRouter } from 'next/navigation';

// Function to calculate age from birth year
const calculateAge = (birthYear: number | null) => {
    if (!birthYear) return '';
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
};

// Define the Profile type
interface Profile {
    id: string;
    name: string | null;
    birth_year: number | null;
    occupation: string | null;
    bio: string | null;
    photos: (string | null)[] | null;
    sponsored_by_id: string | null;
    matchmakr_endorsement: string | null;
}

export default function ProfilePage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [authUser, setAuthUser] = useState<any>(null);
    const [sponsorName, setSponsorName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchProfileData = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setAuthUser(user);

        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', params.id)
            .single();
        
        if (error || !profileData) {
            setProfile(null);
        } else {
            setProfile(profileData);
            if (profileData.sponsored_by_id) {
                 const { data: sponsorProfile } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', profileData.sponsored_by_id)
                    .single();
                if (sponsorProfile) setSponsorName(sponsorProfile.name);
            }
        }
        setLoading(false);
    }, [params.id, supabase, router]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const handleSave = () => {
        setIsEditModalOpen(false);
        fetchProfileData();
    };
    
    if (loading) {
        return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
    }

    if (!profile) {
        return <div className="text-center py-10">Profile not found.</div>;
    }
    
    const isOwnProfile = authUser?.id === profile.id;
    const age = calculateAge(profile.birth_year);
    const firstName = profile.name?.split(' ')[0] || '';

    return (
        <>
            <div className="min-h-screen bg-gray-100 p-4">
                 <button
                    onClick={async () => {
                        if (typeof window !== 'undefined' && window.history.length > 2) {
                            router.back();
                            return;
                        }
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                            router.push('/login');
                            return;
                        }
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('user_type')
                            .eq('id', user.id)
                            .single();
                        if (profileData?.user_type) {
                            router.push(`/dashboard/${profileData.user_type.toLowerCase()}`);
                        } else {
                            router.push('/');
                        }
                    }}
                    className="text-blue-500 hover:underline mb-4 inline-block"
                 >
                    &larr; Back
                 </button>
                <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
                    <PhotoGallery 
                        userId={profile.id} 
                        photos={profile.photos}
                    />

                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <h1 className="text-3xl font-bold text-gray-900">{profile.name}{age ? `, ${age}` : ''}</h1>
                            {isOwnProfile && (
                                <button onClick={() => setIsEditModalOpen(true)} className="bg-pink-600 text-white px-3 py-1 text-sm rounded-md hover:bg-pink-500">
                                    Edit
                                </button>
                            )}
                        </div>
                        <p className="text-gray-600 mt-1">{profile.occupation || 'No occupation listed'}</p>
                        
                        <div className="mt-6 border-t border-gray-200 pt-4">
                             <h2 className="text-lg font-semibold text-gray-800">About {firstName}</h2>
                             <p className="mt-2 text-sm text-gray-700">{profile.bio || 'No bio yet.'}</p>
                        </div>
                        <div className="mt-6 border-t border-pink-200 pt-4">
                            <h2 className="text-lg font-semibold text-pink-600">What their MatchMakr says</h2>
                            <p className="mt-2 text-sm text-gray-700">{profile.matchmakr_endorsement || 'This is where your matchmakr writes about you...'}</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* MatchMakr Info Card Template */}
            <div className="max-w-sm mx-auto mt-6 bg-pink-50 rounded-2xl shadow-lg overflow-hidden flex flex-col items-center p-6">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-pink-300 mb-2">
                    <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="MatchMakr profile" className="w-full h-full object-cover" />
                </div>
                <div className="font-bold text-lg text-pink-700 mb-1">Alex Smith's MatchMakr</div>
                <button className="mt-2 px-6 py-2 rounded-full bg-pink-400 text-white font-semibold shadow disabled:opacity-50" disabled>
                    Chat with Jamie Lee
                </button>
            </div>
            {isEditModalOpen && (
                <EditProfileModal
                    profile={profile}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </>
    );
} 