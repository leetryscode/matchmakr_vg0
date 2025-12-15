'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/components/profile/types';
import Link from 'next/link';
import InterestsInput from '@/components/profile/InterestsInput';
import SelectSingleModal from '@/components/dashboard/SelectSingleModal';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface PondProfile extends Profile {
    profile_pic_url: string | null;
    interests?: { id: number; name: string }[];
}

interface PondCache {
    profiles: PondProfile[];
    page: number;
    hasMore: boolean;
    searchCity: string;
    searchState: string;
    searchZip: string;
    selectedInterests: { id: number; name: string }[];
    scrollPosition: number;
    timestamp: number;
}

const CACHE_KEY = 'pond_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function PondPage() {
    const supabase = createClient();
    const { user, loading: authLoading, orbitRole } = useAuth();
    const [profiles, setProfiles] = useState<PondProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchCity, setSearchCity] = useState('');
    const [searchState, setSearchState] = useState('');
    const [searchZip, setSearchZip] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
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
    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showingCachedData, setShowingCachedData] = useState(false);
    const ITEMS_PER_PAGE = 20;

    const router = useRouter();
    const pathname = usePathname();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Cache management functions
    const saveToCache = (data: Omit<PondCache, 'timestamp'>) => {
        try {
            const cacheData: PondCache = {
                ...data,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            console.log('Saved to cache:', cacheData);
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    };

    const loadFromCache = (): PondCache | null => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            
            const cacheData: PondCache = JSON.parse(cached);
            const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION;
            
            if (isExpired) {
                localStorage.removeItem(CACHE_KEY);
                return null;
            }
            
            console.log('Loaded from cache:', cacheData);
            return cacheData;
        } catch (error) {
            console.error('Error loading from cache:', error);
            return null;
        }
    };

    const clearCache = () => {
        try {
            localStorage.removeItem(CACHE_KEY);
            console.log('Cache cleared');
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    };

    // Restore scroll position
    const restoreScrollPosition = (position: number) => {
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = position;
                console.log('Restored scroll position:', position);
            }
        }, 100);
    };

    // Save scroll position
    const saveScrollPosition = () => {
        if (scrollContainerRef.current) {
            const position = scrollContainerRef.current.scrollTop;
            const currentCache = loadFromCache();
            if (currentCache) {
                saveToCache({
                    ...currentCache,
                    scrollPosition: position
                });
            }
        }
    };

    // Wait for auth to load, then check authorization and load data
    useEffect(() => {
        // Don't do anything while auth is still loading
        if (authLoading) {
            return;
        }

        // If no user, redirect to login
        if (!user) {
            router.push('/login');
            return;
        }

        // Wait for orbitRole to be determined (not null) before checking authorization
        // If orbitRole is null, it means user type is still being fetched
        if (orbitRole === null) {
            console.log('Pond page: Waiting for user type to load...');
            return;
        }

        // Check authorization - only MATCHMAKR users can access pond
        if (orbitRole !== 'MATCHMAKR') {
            console.log('Pond page: User is not MATCHMAKR, redirecting');
            router.push('/dashboard/single');
            return;
        }

        console.log('Pond page useEffect triggered');
        
        // Try to load from cache first
        const cached = loadFromCache();
        if (cached) {
            console.log('Using cached data');
            setProfiles(cached.profiles);
            setPage(cached.page);
            setHasMore(cached.hasMore);
            setSearchCity(cached.searchCity);
            setSearchState(cached.searchState);
            setSearchZip(cached.searchZip);
            setSelectedInterests(cached.selectedInterests);
            setLoading(false);
            setShowingCachedData(true);
            
            // Restore scroll position after a short delay
            restoreScrollPosition(cached.scrollPosition);
        } else {
            console.log('No cache found, loading fresh data');
            setLoading(true);
            setShowingCachedData(false);
            loadUserDataAndProfiles();
        }
    }, [authLoading, user, orbitRole, router]); // Run when auth state changes

    // Save to cache when data changes
    useEffect(() => {
        if (!loading && profiles.length > 0) {
            saveToCache({
                profiles,
                page,
                hasMore,
                searchCity,
                searchState,
                searchZip,
                selectedInterests,
                scrollPosition: scrollContainerRef.current?.scrollTop || 0
            });
        }
    }, [profiles, page, hasMore, searchCity, searchState, searchZip, selectedInterests, loading]);

    // Save scroll position on scroll
    useEffect(() => {
        const handleScroll = () => {
            saveScrollPosition();
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    // Debug loading state changes
    useEffect(() => {
        console.log('Pond page loading state changed:', { loading, profilesCount: profiles.length });
    }, [loading, profiles.length]);

    // Load user profile data and sponsored singles, then load profiles
    const loadUserDataAndProfiles = async () => {
        if (!user) return;
        
        console.log('Pond page loadUserDataAndProfiles started');
        try {
            // Fetch current user's name and profile picture
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('name, photos')
                .eq('id', user.id)
                .single();
            
            // Store user profile data
            const currentUserName = userProfile?.name || '';
            const currentUserProfilePic = userProfile?.photos && userProfile.photos.length > 0 ? userProfile.photos[0] : null;
            setCurrentUserName(currentUserName);
            setCurrentUserProfilePic(currentUserProfilePic);
            setCurrentUser({ ...user, name: currentUserName, photos: userProfile?.photos });

            // Fetch the current user's sponsored singles
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

            console.log('Pond page calling loadProfiles');
            await loadProfiles(false, 1);
        } catch (error) {
            console.error('Error in loadUserDataAndProfiles:', error);
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadProfiles = async (isLoadMore = false, currentPage = page, forceRefresh = false) => {
        console.log('Pond page loadProfiles called with:', { isLoadMore, currentPage, page, forceRefresh });
        
        // If we have cached data and this isn't a forced refresh, show cached data immediately
        if (!forceRefresh && !isLoadMore) {
            const cached = loadFromCache();
            if (cached && cached.profiles.length > 0) {
                console.log('Showing cached data immediately');
                setProfiles(cached.profiles);
                setPage(cached.page);
                setHasMore(cached.hasMore);
                setSearchCity(cached.searchCity);
                setSearchState(cached.searchState);
                setSearchZip(cached.searchZip);
                setSelectedInterests(cached.selectedInterests);
                setLoading(false);
                
                // Restore scroll position
                restoreScrollPosition(cached.scrollPosition);
                
                // Load fresh data in background
                setTimeout(() => {
                    loadProfiles(false, 1, true);
                }, 1000);
                return;
            }
        }
        
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            // Use the new optimized API endpoint
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: ITEMS_PER_PAGE.toString(),
                city: searchCity,
                state: searchState,
                zip: searchZip,
                interests: JSON.stringify(selectedInterests)
            });

            const response = await fetch(`/api/profiles/pond?${params}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const data = await response.json();

            console.log('Pond page received data:', { success: data.success, profilesCount: data.profiles?.length || 0, error: data.error });

            if (!data.success) {
                console.error('Error loading profiles:', data.error);
                return;
            }

            // Check if we have more data
            setHasMore(data.hasMore);

            if (isLoadMore) {
                setProfiles(prev => [...prev, ...data.profiles]);
            } else {
                setProfiles(data.profiles);
            }
            
            // Clear cached data flag when fresh data loads
            if (!isLoadMore) {
                setShowingCachedData(false);
            }
            
            console.log('Pond page profiles updated:', { profilesCount: data.profiles?.length || 0, loading: false });
        } catch (error) {
            console.error('Error loading profiles:', error);
            if (isLoadMore) {
                setLoadingMore(false);
            } else {
                setLoading(false);
            }
        } finally {
            if (isLoadMore) {
                setLoadingMore(false);
            } else {
                setLoading(false);
            }
        }
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadProfiles(true, nextPage);
        }
    };

    const handleSearch = () => {
        setPage(1);
        loadProfiles(false, 1);
    };

    const handleClearSearch = () => {
        setSearchCity('');
        setSearchState('');
        setSearchZip('');
        setPage(1);
        loadProfiles(false, 1);
    };

    const calculateAge = (birthYear: number | null): number | null => {
        if (!birthYear) return null;
        const currentYear = new Date().getFullYear();
        return currentYear - birthYear;
    };

    // Handler to open chat modal and fetch matchmakr info
    const handleOpenChat = async (profile: PondProfile) => {
        if (!profile.sponsored_by_id) return;
        
        // Check if user has multiple sponsored singles
        if (sponsoredSingles.length > 1) {
            // Show single selection modal
            setPendingChatProfile(profile);
            setShowSelectSingleModal(true);
            return;
        }
        
        // If only one sponsored single, use it directly
        const singleId = sponsoredSingles.length === 1 ? sponsoredSingles[0].id : null;
        await openChatWithSingle(profile, singleId);
    };

    const openChatWithSingle = async (profile: PondProfile, singleId: string | null) => {
        if (!profile.sponsored_by_id) return;
        
        // Fetch the matchmakr's info
        const { data: matchmakr } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('id', profile.sponsored_by_id)
            .single();
        
        if (matchmakr) {
            setSelectedSingleForChat(profile.id);
            setClickedSingleForChat({
                id: matchmakr.id,
                name: matchmakr.name,
                photo: matchmakr.photos && matchmakr.photos.length > 0 ? matchmakr.photos[0] : null
            });
            
            // Set aboutSingleForChat to the selected single
            const aboutSingleObj = sponsoredSingles.find(s => s.id === (singleId || profile.id)) || { id: singleId || profile.id, name: '', photo: null };
            setAboutSingleForChat({ id: aboutSingleObj.id, name: aboutSingleObj.name, photo: aboutSingleObj.photo });
        }
        
        // Create or find conversation
        const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('initiator_matchmakr_id', currentUser.id < profile.sponsored_by_id ? currentUser.id : profile.sponsored_by_id)
            .eq('recipient_matchmakr_id', currentUser.id < profile.sponsored_by_id ? profile.sponsored_by_id : currentUser.id)
            .eq('about_single_id', singleId || profile.id)
            .eq('clicked_single_id', profile.id)
            .maybeSingle();
        
        if (conversation) {
            router.push(`/dashboard/chat/${conversation.id}`);
        } else {
            // Create new conversation
            const { data } = await supabase
                .from('conversations')
                .insert({
                    initiator_matchmakr_id: currentUser.id < profile.sponsored_by_id ? currentUser.id : profile.sponsored_by_id,
                    recipient_matchmakr_id: currentUser.id < profile.sponsored_by_id ? profile.sponsored_by_id : currentUser.id,
                    about_single_id: singleId || profile.id,
                    clicked_single_id: profile.id
                })
                .select('id')
                .single();
            
            if (data) {
                router.push(`/dashboard/chat/${data.id}`);
            }
        }
    };

    const handleSingleSelected = async (singleId: string) => {
        if (pendingChatProfile) {
            await openChatWithSingle(pendingChatProfile, singleId);
        }
    };

    const handleCloseChat = () => {
        setShowSelectSingleModal(false);
        setPendingChatProfile(null);
    };

    console.log('Pond page render state:', { loading: loading || authLoading, profilesCount: profiles.length, hasMore });

    // Show loading while auth is loading or if we're still loading data
    if (authLoading || (loading && profiles.length === 0 && !showingCachedData)) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-blue to-primary-teal p-4 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                    <p className="mt-4 text-white">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-blue to-primary-teal p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => router.push('/dashboard/matchmakr?refresh=true')}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
                            Back to Dashboard
                        </button>
                        <div></div> {/* Spacer for centering */}
                    </div>
                    <h1 className="text-4xl font-light text-white mb-2 tracking-[0.1em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>THE POND</h1>
                    <p className="text-white">Find singles, message their sponsor</p>
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
                    <button
                        onClick={() => {
                            clearCache();
                            setLoading(true);
                            setShowingCachedData(false);
                            loadProfiles(false, 1, true);
                        }}
                        className="px-3 py-1 bg-white/10 text-white rounded-md border border-white/20 hover:bg-white/20 text-sm transition-colors"
                        title="Clear cache and reload"
                    >
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
                        <p className="mt-4 text-white">Loading profiles...</p>
                        <p className="text-white text-sm">Debug: loading={loading.toString()}, profiles.length={profiles.length}</p>
                    </div>
                ) : profiles.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-white text-lg">No singles found matching your criteria.</p>
                        <p className="text-white mt-2">Try adjusting your search filters.</p>
                    </div>
                ) : (
                    <div 
                        ref={scrollContainerRef}
                        className="max-h-[calc(70vh-5rem)] overflow-y-auto"
                    >
                        <div key={`profiles-${profiles.length}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                                                {/* Message Sponsor Button */}
                                                {profile.sponsored_by_id && (
                                                    <button
                                                        className="mt-2 px-4 py-2 rounded-full border border-accent-teal-light bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                                                        onClick={e => { e.preventDefault(); handleOpenChat(profile); }}
                                                    >
                                                        Message Sponsor
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* Load More Button */}
                {!loading && hasMore && (
                    <div className="text-center mt-8">
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="px-8 py-3 bg-white/20 text-white rounded-lg border border-white/20 hover:bg-white/30 font-semibold transition-colors disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Loading more...
                                </div>
                            ) : (
                                'Load More Singles'
                            )}
                        </button>
                    </div>
                )}
            </div>
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
                  (profiles.find(p => p.id === pendingChatProfile.id)?.name || 'this Sponsor') :
                  'this Sponsor'}
                currentUserId={currentUser?.id}
                otherUserId={pendingChatProfile?.sponsored_by_id || undefined}
                clickedSingleId={pendingChatProfile?.id || undefined}
            />
        </div>
    );
}
