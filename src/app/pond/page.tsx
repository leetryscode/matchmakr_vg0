'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/components/profile/types';
import Link from 'next/link';
import ChatModal from '@/components/chat/ChatModal';
import InterestsInput from '@/components/profile/InterestsInput';
import SelectSingleModal from '@/components/dashboard/SelectSingleModal';

interface PondProfile extends Profile {
    profile_pic_url: string | null;
    interests?: { id: number; name: string }[];
}

export default function PondPage() {
    const supabase = createClient();
    const [profiles, setProfiles] = useState<PondProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchCity, setSearchCity] = useState('');
    const [searchState, setSearchState] = useState('');
    const [searchZip, setSearchZip] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [openChatProfileId, setOpenChatProfileId] = useState<string | null>(null);
    const [openChatMatchmakr, setOpenChatMatchmakr] = useState<{id: string, name: string | null, profile_pic_url: string | null} | null>(null);
    const [chatLoading, setChatLoading] = useState(false);
    // Restore state variables for single selection
    const [currentSponsoredSingle, setCurrentSponsoredSingle] = useState<{ id: string, name: string, photo: string | null } | null>(null);
    const [sponsoredSingles, setSponsoredSingles] = useState<{ id: string, name: string, photo: string | null }[]>([]);
    const [currentUserName, setCurrentUserName] = useState('');
    const [currentUserProfilePic, setCurrentUserProfilePic] = useState<string | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<{ id: number; name: string }[]>([]);
    const [showSelectSingleModal, setShowSelectSingleModal] = useState(false);
    const [pendingChatProfile, setPendingChatProfile] = useState<PondProfile | null>(null);
    const [selectedSingleForChat, setSelectedSingleForChat] = useState<string | null>(null);
    const [clickedSingleForChat, setClickedSingleForChat] = useState<{ id: string, name: string, photo: string | null } | null>(null);
    const [aboutSingleForChat, setAboutSingleForChat] = useState<{ id: string, name: string, photo: string | null } | null>(null);

    useEffect(() => {
        checkUserAndLoadProfiles();
    }, []);

    const checkUserAndLoadProfiles = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/login';
            return;
        }

        // Fetch current user's name and profile picture
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('name, photos')
            .eq('id', user.id)
            .single();
        // Store user profile data for ChatModal
        const currentUserName = userProfile?.name || '';
        const currentUserProfilePic = userProfile?.photos && userProfile.photos.length > 0 ? userProfile.photos[0] : null;
        setCurrentUserName(currentUserName);
        setCurrentUserProfilePic(currentUserProfilePic);

        // Check if user is a matchmakr
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

        if (profile?.user_type !== 'MATCHMAKR') {
            window.location.href = '/dashboard/single';
            return;
        }

        setCurrentUser({ ...user, name: currentUserName, photos: userProfile?.photos });

        // Fetch the current user's sponsored singles for ChatModal
        const { data: singles } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('sponsored_by_id', user.id)
            .eq('user_type', 'SINGLE');
        
        const sponsoredSingles = singles ? singles.map(single => ({
            id: single.id,
            name: single.name || '',
            photo: single.photos && single.photos.length > 0 ? single.photos[0] : null
        })) : [];
        
        setSponsoredSingles(sponsoredSingles);
        if (sponsoredSingles.length > 0) {
            setCurrentSponsoredSingle(sponsoredSingles[0]);
        }

        await loadProfiles();
    };

    const loadProfiles = async () => {
        setLoading(true);
        
        console.log('Search values:', { searchCity, searchState, searchZip }); // Debug log

        let query = supabase
            .from('profiles')
            .select('*')
            .eq('user_type', 'SINGLE')
            .not('sponsored_by_id', 'is', null);

        // Build filter conditions for partial matches
        const filters = [];
        if (searchCity.trim() !== '') {
            filters.push(`city.ilike.%${searchCity}%`);
        }
        if (searchState.trim() !== '') {
            filters.push(`state.ilike.%${searchState}%`);
        }
        if (searchZip.trim() !== '') {
            filters.push(`zip_code.ilike.%${searchZip}%`);
        }

        if (filters.length > 0) {
            // Use or() with the 'filter' option to apply to the row
            query = query.or(filters.join(','), { foreignTable: undefined });
            console.log('OR filter string:', filters.join(','));
        }

        if (filters.length === 0) {
            console.log('No filters applied, fetching all singles.');
        }

        const { data, error } = await query;

        console.log('Supabase data:', data, 'Error:', error); // Debug log

        // Direct query for all singles (for debugging)
        if (filters.length === 0) {
            const direct = await supabase
                .from('profiles')
                .select('*')
                .eq('user_type', 'SINGLE')
                .not('sponsored_by_id', 'is', null);
            console.log('Direct all singles query:', direct.data, 'Error:', direct.error);
        }

        if (error) {
            console.error('Error loading profiles:', error);
            return;
        }

        // Transform data to include profile_pic_url
        const transformedProfiles = data?.map(profile => ({
            ...profile,
            profile_pic_url: profile.photos && profile.photos.length > 0 ? profile.photos[0] : null
        })) || [];

        setProfiles(transformedProfiles);
        setLoading(false);

        // Fetch interests for all profiles in parallel
        const interestsResults = await Promise.all(
            transformedProfiles.map(async (profile) => {
                const res = await fetch(`/api/profiles/${profile.id}/interests`);
                const data = await res.json();
                return { id: profile.id, interests: data.interests || [] };
            })
        );
        let updatedProfiles = transformedProfiles.map(p => {
            const found = interestsResults.find(i => i.id === p.id);
            return found ? { ...p, interests: found.interests } : p;
        });

        // Rank profiles: those matching selected interests first, then the rest
        if (selectedInterests.length > 0) {
            const selectedIds = selectedInterests.map(i => i.id);
            updatedProfiles = [
                ...updatedProfiles.filter(p => p.interests && p.interests.some((interest: { id: number; name: string }) => selectedIds.includes(interest.id))),
                ...updatedProfiles.filter(p => !p.interests || !p.interests.some((interest: { id: number; name: string }) => selectedIds.includes(interest.id)))
            ];
        }
        setProfiles(updatedProfiles);
    };

    const handleSearch = () => {
        loadProfiles();
    };

    const handleClearSearch = () => {
        setSearchCity('');
        setSearchState('');
        setSearchZip('');
        loadProfiles();
    };

    const calculateAge = (birthYear: number | null): number | null => {
        if (!birthYear) return null;
        const currentYear = new Date().getFullYear();
        return currentYear - birthYear;
    };

    // Handler to open chat modal and fetch matchmakr info
    const handleOpenChat = async (profile: PondProfile) => {
        if (!profile.sponsored_by_id) return;
        
        setChatLoading(true);
        
        // Check if user has multiple sponsored singles
        if (sponsoredSingles.length > 1) {
            // Store the profile for later use and show single selection modal
            setPendingChatProfile(profile);
            setShowSelectSingleModal(true);
            setChatLoading(false);
            return;
        }
        
        // If user has only one or no singles, proceed with normal flow
        await openChatWithSingle(profile, sponsoredSingles.length > 0 ? sponsoredSingles[0].id : null);
    };

    const openChatWithSingle = async (profile: PondProfile, singleId: string | null) => {
        if (!profile.sponsored_by_id) return;
        
        setChatLoading(true);
        
        // Fetch the matchmakr's info
        const { data: matchmakr } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('id', profile.sponsored_by_id)
            .single();
        
        if (matchmakr) {
            setOpenChatProfileId(profile.id);
            setOpenChatMatchmakr({
                id: matchmakr.id,
                name: matchmakr.name,
                profile_pic_url: matchmakr.photos && matchmakr.photos.length > 0 ? matchmakr.photos[0] : null
            });
            // Set aboutSingleForChat to the sponsored single object
            const aboutSingleObj = sponsoredSingles.find(s => s.id === (singleId || profile.id)) || { id: singleId || profile.id, name: '', photo: null };
            setAboutSingleForChat({ id: aboutSingleObj.id, name: aboutSingleObj.name, photo: aboutSingleObj.photo });
            // Set clickedSingleForChat to the clicked profile object
            const clickedProfile = profiles.find(p => p.id === profile.id);
            const clickedSingleObj = clickedProfile ? { id: clickedProfile.id, name: clickedProfile.name || '', photo: clickedProfile.profile_pic_url || null } : { id: profile.id, name: profile.name || '', photo: profile.profile_pic_url || null };
            setClickedSingleForChat(clickedSingleObj);
        }
        
        setChatLoading(false);
    };

    const handleSingleSelected = async (singleId: string) => {
        if (pendingChatProfile) {
            await openChatWithSingle(pendingChatProfile, singleId);
        }
        setShowSelectSingleModal(false);
        setPendingChatProfile(null);
    };

    const handleCloseChat = () => {
        setOpenChatProfileId(null);
        setOpenChatMatchmakr(null);
        setSelectedSingleForChat(null);
        setClickedSingleForChat(null);
        setAboutSingleForChat(null);
        setPendingChatProfile(null);
        setShowSelectSingleModal(false);
    };

    // Remove unused chat functions - ChatModal handles all chat functionality

    return (
        <div className="min-h-screen bg-gradient-main p-4 sm:p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">The Pond</h1>
                    <p className="text-white">Find your single the perfect match!</p>
                </div>

                {/* Search Filters */}
                <div className="bg-white/10 rounded-xl p-3 mb-6 shadow-deep border border-white/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-white mb-1">City</label>
                            <input
                                type="text"
                                id="city"
                                value={searchCity}
                                onChange={(e) => setSearchCity(e.target.value)}
                                className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder-white/60 focus:border-accent-teal-light focus:outline-none focus:ring-2 focus:ring-accent-teal-light focus:ring-opacity-50 shadow-inner"
                                placeholder="e.g., New York"
                            />
                        </div>
                        <div>
                            <label htmlFor="state" className="block text-sm font-medium text-white mb-1">State</label>
                            <input
                                type="text"
                                id="state"
                                value={searchState}
                                onChange={(e) => setSearchState(e.target.value)}
                                className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder-white/60 focus:border-accent-teal-light focus:outline-none focus:ring-2 focus:ring-accent-teal-light focus:ring-opacity-50 shadow-inner"
                                placeholder="e.g., NY"
                            />
                        </div>
                        <div>
                            <label htmlFor="zip" className="block text-sm font-medium text-white mb-1">ZIP Code</label>
                            <input
                                type="text"
                                id="zip"
                                value={searchZip}
                                onChange={(e) => setSearchZip(e.target.value)}
                                className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder-white/60 focus:border-accent-teal-light focus:outline-none focus:ring-2 focus:ring-accent-teal-light focus:ring-opacity-50 shadow-inner"
                                placeholder="e.g., 10001"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mb-2">
                        <button
                            onClick={handleSearch}
                            className="px-6 py-2 bg-white/20 text-white rounded-md border border-white/20 hover:bg-white/30 font-semibold transition-colors shadow-inner"
                        >
                            Search
                        </button>
                        <button
                            onClick={handleClearSearch}
                            className="px-6 py-2 bg-white/10 text-white rounded-md border border-white/20 hover:bg-white/20 font-semibold transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    {/* Interest filter */}
                    <div className="mt-2">
                        <label className="block text-sm font-medium text-white mb-1">Filter by Interests</label>
                        <InterestsInput
                            value={selectedInterests}
                            onChange={setSelectedInterests}
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">
                        {loading ? 'Loading...' : `${profiles.length} singles found`}
                    </h2>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
                        <p className="mt-4 text-white">Loading profiles...</p>
                    </div>
                ) : profiles.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-white text-lg">No singles found matching your criteria.</p>
                        <p className="text-white mt-2">Try adjusting your search filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {profiles.map((profile) => {
                            const age = calculateAge(profile.birth_year);
                            return (
                                <Link href={`/profile/${profile.id}`} key={profile.id} className="group block">
                                    <div className="bg-white/10 rounded-2xl p-4 shadow-card hover:shadow-card-hover border border-white/20 transition-all duration-300 group-hover:scale-105">
                                        {/* Profile Picture - large square, rounded-2xl */}
                                        <div className="w-full aspect-square max-w-xs mx-auto mb-4 overflow-hidden rounded-2xl border-2 border-white group-hover:border-accent-teal-light transition-all duration-300 flex items-center justify-center bg-gray-200">
                                            {profile.profile_pic_url ? (
                                                <img 
                                                    src={profile.profile_pic_url} 
                                                    alt={profile.name || 'Profile'} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <span className="text-2xl font-bold text-white">{profile.name?.charAt(0).toUpperCase() || '?'}</span>
                                            )}
                                        </div>
                                        {/* Name and Age only */}
                                        <div className="text-center">
                                            <div className="flex items-center justify-center mb-1">
                                                <span className="text-2xl font-bold text-white">{profile.name}{age ? ',' : ''}</span>
                                                {age && (
                                                    <span className="text-2xl font-bold text-white ml-2 align-middle">{age}</span>
                                                )}
                                            </div>
                                            {/* Interests badges */}
                                            {profile.interests && profile.interests.length > 0 && (
                                                <div className="flex flex-wrap justify-center gap-2 mb-2">
                                                    {profile.interests.slice(0, 5).map(interest => (
                                                        <span key={interest.id} className="bg-white/20 text-white px-3 py-1 rounded-full text-xs">
                                                            {interest.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Message MatchMakr Button */}
                                            {profile.sponsored_by_id && (
                                                <button
                                                    className="mt-2 px-4 py-2 rounded-full border border-accent-teal-light bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                                                    onClick={e => { e.preventDefault(); handleOpenChat(profile); }}
                                                    disabled={chatLoading && openChatProfileId === profile.id}
                                                >
                                                    {chatLoading && openChatProfileId === profile.id ? 'Loading...' : 'Message MatchMakr'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* Chat Modal (global, not per card) */}
            {openChatProfileId && openChatMatchmakr && aboutSingleForChat && clickedSingleForChat && (
                <ChatModal
                    key={`${aboutSingleForChat.id}-${clickedSingleForChat.id}-${openChatMatchmakr.id}`}
                    open={!!openChatProfileId && !!openChatMatchmakr}
                    onClose={handleCloseChat}
                    currentUserId={currentUser?.id || ''}
                    currentUserName={currentUserName || ''}
                    currentUserProfilePic={currentUserProfilePic || null}
                    otherUserId={openChatMatchmakr.id || ''}
                    otherUserName={openChatMatchmakr.name || ''}
                    otherUserProfilePic={openChatMatchmakr.profile_pic_url || null}
                    aboutSingle={aboutSingleForChat}
                    clickedSingle={clickedSingleForChat}
                />
            )}

            {/* Select Single Modal */}
            <SelectSingleModal
                open={showSelectSingleModal}
                onClose={() => {
                    setShowSelectSingleModal(false);
                    setPendingChatProfile(null);
                }}
                sponsoredSingles={sponsoredSingles}
                onSelectSingle={handleSingleSelected}
                otherMatchmakrName={pendingChatProfile?.sponsored_by_id ? 
                    (profiles.find(p => p.id === pendingChatProfile.id)?.name || 'this MatchMakr') : 
                    'this MatchMakr'}
            />
        </div>
    );
}
