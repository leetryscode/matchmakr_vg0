'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/components/profile/types';
import Link from 'next/link';
import ChatModal from '@/components/chat/ChatModal';
import InterestsInput from '@/components/profile/InterestsInput';

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
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatLoadingHistory, setChatLoadingHistory] = useState(false);
    const [currentSponsoredSingle, setCurrentSponsoredSingle] = useState<{ id: string, name: string, photo: string | null } | null>(null);
    const [currentUserName, setCurrentUserName] = useState('');
    const [currentUserProfilePic, setCurrentUserProfilePic] = useState<string | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<{ id: number; name: string }[]>([]);

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
        setCurrentUserName(userProfile?.name || '');
        setCurrentUserProfilePic(userProfile?.photos && userProfile.photos.length > 0 ? userProfile.photos[0] : null);

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

        setCurrentUser(user);

        // Fetch the current user's sponsored single (first one if multiple)
        const { data: singles } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('sponsored_by_id', user.id)
            .eq('user_type', 'SINGLE');
        if (singles && singles.length > 0) {
            setCurrentSponsoredSingle({
                id: singles[0].id,
                name: singles[0].name || '',
                photo: singles[0].photos && singles[0].photos.length > 0 ? singles[0].photos[0] : null
            });
        } else {
            setCurrentSponsoredSingle(null);
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
        setChatLoading(true);
        setOpenChatProfileId(profile.id);
        if (profile.sponsored_by_id) {
            const { data } = await supabase
                .from('profiles')
                .select('id, name, photos')
                .eq('id', profile.sponsored_by_id)
                .eq('user_type', 'MATCHMAKR')
                .single();
            if (data) {
                setOpenChatMatchmakr({
                    id: data.id,
                    name: data.name,
                    profile_pic_url: data.photos && data.photos.length > 0 ? data.photos[0] : null
                });
            } else {
                setOpenChatMatchmakr(null);
            }
        } else {
            setOpenChatMatchmakr(null);
        }
        setChatLoading(false);
    };

    const handleCloseChat = () => {
        setOpenChatProfileId(null);
        setOpenChatMatchmakr(null);
    };

    const handleSendMessage = async () => {
        if (!currentUser?.id || !openChatMatchmakr?.id || !messageText.trim()) return;
        setSending(true);
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_id: currentUser.id,
                    recipient_id: openChatMatchmakr.id,
                    content: messageText.trim(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMessageText('');
            } else {
                alert(data.error || 'Failed to send message');
            }
        } catch (err) {
            alert('Failed to send message');
        }
        setSending(false);
    };

    // Fetch chat history when modal opens
    useEffect(() => {
        const fetchChatHistory = async () => {
            if (!openChatProfileId || !openChatMatchmakr || !currentUser?.id) return;
            setChatLoadingHistory(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${openChatMatchmakr.id}),and(sender_id.eq.${openChatMatchmakr.id},recipient_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true });
            if (!error && data) {
                setChatMessages(data);
            } else {
                setChatMessages([]);
            }
            setChatLoadingHistory(false);
        };
        if (openChatProfileId && openChatMatchmakr && currentUser?.id) {
            fetchChatHistory();
        }
    }, [openChatProfileId, openChatMatchmakr, currentUser?.id]);

    // After sending a message, append to chat
    useEffect(() => {
        if (!sending && messageText === '' && openChatProfileId && openChatMatchmakr && currentUser?.id) {
            // Refetch chat history after sending
            (async () => {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${openChatMatchmakr.id}),and(sender_id.eq.${openChatMatchmakr.id},recipient_id.eq.${currentUser.id})`)
                    .order('created_at', { ascending: true });
                if (!error && data) {
                    setChatMessages(data);
                }
            })();
        }
    }, [sending, messageText, openChatProfileId, openChatMatchmakr, currentUser?.id]);

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
            {openChatProfileId && openChatMatchmakr && (
                <ChatModal
                    open={!!openChatProfileId && !!openChatMatchmakr}
                    onClose={handleCloseChat}
                    currentUserId={currentUser?.id || ''}
                    currentUserName={currentUserName || ''}
                    currentUserProfilePic={currentUserProfilePic || null}
                    otherUserId={openChatMatchmakr.id || ''}
                    otherUserName={openChatMatchmakr.name || ''}
                    otherUserProfilePic={openChatMatchmakr.profile_pic_url || null}
                    aboutSingleA={(profiles.find(p => p.id === openChatProfileId)
                        ? { id: profiles.find(p => p.id === openChatProfileId)!.id, name: profiles.find(p => p.id === openChatProfileId)!.name || '', photo: profiles.find(p => p.id === openChatProfileId)!.profile_pic_url || null }
                        : { id: '', name: '', photo: null })}
                    aboutSingleB={currentSponsoredSingle ? { id: currentSponsoredSingle.id, name: currentSponsoredSingle.name, photo: currentSponsoredSingle.photo } : { id: '', name: '', photo: null }}
                />
            )}
        </div>
    );
}
