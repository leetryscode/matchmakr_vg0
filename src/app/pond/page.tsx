'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/components/profile/types';
import Link from 'next/link';
import InterestsInput from '@/components/profile/InterestsInput';
import SelectSingleModal from '@/components/dashboard/SelectSingleModal';
import InviteSingleModal from '@/components/dashboard/InviteSingleModal';
import SendPreviewModal from '@/components/dashboard/SendPreviewModal';
import Toast from '@/components/ui/Toast';
import DashboardFooterSpacer from '@/components/dashboard/DashboardFooterSpacer';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RequireStandaloneGate from '@/components/pwa/RequireStandaloneGate';
import { REQUIRE_STANDALONE_ENABLED } from '@/config/pwa';
import PairingsSection from '@/components/profile/PairingsSection';
import IntroductionSignalSection from '@/components/profile/IntroductionSignalSection';
import { getPondCacheKey } from '@/lib/pond-cache';
import { calculateAge } from '@/lib/age';

interface PondProfile extends Profile {
    profile_pic_url: string | null;
    interests?: { id: number; name: string }[];
    sponsor_name?: string | null;
    sponsor_photo_url?: string | null;
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

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBUG = false; // Set to true to enable console logging

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
    const [showInviteSingleModal, setShowInviteSingleModal] = useState(false);
    const [showTailorSearchModal, setShowTailorSearchModal] = useState(false);
    const [pendingChatProfile, setPendingChatProfile] = useState<PondProfile | null>(null);
    const [selectedSingleForChat, setSelectedSingleForChat] = useState<string | null>(null);
    const [clickedSingleForChat, setClickedSingleForChat] = useState<{ id: string, name: string, photo: string | null } | null>(null);
    const [aboutSingleForChat, setAboutSingleForChat] = useState<{ id: string, name: string, photo: string | null } | null>(null);
    // Send Preview Modal state
    const [showSendPreviewModal, setShowSendPreviewModal] = useState(false);
    const [selectedTargetForPreview, setSelectedTargetForPreview] = useState<PondProfile | null>(null);
    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showingCachedData, setShowingCachedData] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const ITEMS_PER_PAGE = 20;

    const router = useRouter();
    const pathname = usePathname();
    // Store scroll position in a ref to avoid re-renders
    const scrollPositionRef = useRef<number>(0);
    // Store current cache key for saveScrollPositionToCache on unmount
    const cacheKeyRef = useRef<string>('');

    const getCacheKey = (selectedSingleIdOverride?: string | null) => {
        const singleId = selectedSingleIdOverride !== undefined
            ? (selectedSingleIdOverride || 'none')
            : (currentSponsoredSingle?.id || 'none');
        return getPondCacheKey({
            selectedSingleId: singleId === 'none' ? null : singleId,
            city: searchCity,
            state: searchState,
            zip: searchZip,
            selectedInterests
        });
    };

    // Cache management functions
    const saveToCache = (key: string, data: Omit<PondCache, 'timestamp'>) => {
        try {
            const cacheData: PondCache = {
                ...data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
            cacheKeyRef.current = key;
            if (DEBUG) console.log('Saved to cache:', cacheData);
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    };

    const loadFromCache = (key: string): PondCache | null => {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const cacheData: PondCache = JSON.parse(cached);
            const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION;

            if (isExpired) {
                localStorage.removeItem(key);
                return null;
            }

            if (DEBUG) console.log('Loaded from cache:', cacheData);
            return cacheData;
        } catch (error) {
            console.error('Error loading from cache:', error);
            return null;
        }
    };

    const clearCache = (key: string) => {
        try {
            localStorage.removeItem(key);
            if (DEBUG) console.log('Cache cleared');
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    };

    // Restore scroll position using window scroll
    // Use requestAnimationFrame + setTimeout to ensure DOM is painted before restoration
    const restoreScrollPosition = (position: number) => {
        // Initialize ref with the position we're restoring to
        scrollPositionRef.current = position;
        requestAnimationFrame(() => {
            setTimeout(() => {
                window.scrollTo(0, position);
                if (DEBUG) console.log('Restored scroll position:', position);
            }, 0);
        });
    };

    // Update scroll position ref (called on scroll events)
    // This does not trigger re-renders or localStorage writes
    const updateScrollPositionRef = () => {
        scrollPositionRef.current = window.scrollY;
    };

    // Save scroll position to localStorage (only called on unmount or when saving cache)
    const saveScrollPositionToCache = () => {
        const key = cacheKeyRef.current;
        if (!key) return;
        const position = scrollPositionRef.current;
        const currentCache = loadFromCache(key);
        if (currentCache) {
            saveToCache(key, {
                ...currentCache,
                scrollPosition: position
            });
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
            if (DEBUG) console.log('Pond page: Waiting for user type to load...');
            return;
        }

        // Check authorization - only MATCHMAKR users can access pond
        if (orbitRole !== 'MATCHMAKR') {
            if (DEBUG) console.log('Pond page: User is not MATCHMAKR, redirecting');
            router.push('/dashboard/single');
            return;
        }

        if (DEBUG) console.log('Pond page useEffect triggered');
        
        let cancelled = false;
        (async () => {
          // Load user data (sponsored singles) first - needed for selector and selected_single_id in API
          const effectiveSingle = await loadUserData();
          if (cancelled) return;
          
          // Try to load from cache first (key uses effective single + search params)
          const cacheKey = getCacheKey(effectiveSingle?.id ?? null);
          const cached = loadFromCache(cacheKey);
          if (cached) {
            if (DEBUG) console.log('Using cached data');
            cacheKeyRef.current = cacheKey;
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
            // Update isScrolled based on cached scroll position
            if (cached.scrollPosition > 0) {
                setIsScrolled(true);
            }
          } else {
            if (DEBUG) console.log('No cache found, loading fresh data');
            setLoading(true);
            setShowingCachedData(false);
            loadProfiles(false, 1, false, effectiveSingle?.id ?? null);
          }
        })();
        return () => { cancelled = true; };
    }, [authLoading, user, orbitRole, router]); // Run when auth state changes

    // Save to cache when data changes (not on scroll events)
    // Read current scroll position from ref at save time
    useEffect(() => {
        if (!loading && profiles.length > 0) {
            const key = getCacheKey();
            saveToCache(key, {
                profiles,
                page,
                hasMore,
                searchCity,
                searchState,
                searchZip,
                selectedInterests,
                scrollPosition: scrollPositionRef.current
            });
        }
    }, [profiles, page, hasMore, searchCity, searchState, searchZip, selectedInterests, loading, currentSponsoredSingle]);

    // Update scroll position ref on scroll (throttled for performance)
    // Save to localStorage only on unmount to avoid churn
    useEffect(() => {
        let rafId: number | null = null;
        
        const handleScroll = () => {
            // Use requestAnimationFrame to throttle updates
            if (rafId === null) {
                rafId = requestAnimationFrame(() => {
                    updateScrollPositionRef();
                    setIsScrolled(window.scrollY > 0);
                    rafId = null;
                });
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Save scroll position on unmount
        return () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            window.removeEventListener('scroll', handleScroll);
            // Persist scroll position to cache on unmount
            saveScrollPositionToCache();
        };
    }, []);

    // Debug loading state changes
    useEffect(() => {
        if (DEBUG) console.log('Pond page loading state changed:', { loading, profilesCount: profiles.length });
    }, [loading, profiles.length]);

    // Load user profile data and sponsored singles (separate from profile loading).
    // Returns the effective selected single (for use before state has updated).
    const loadUserData = async (): Promise<{ id: string; name: string; photo: string | null } | null> => {
        if (!user) return null;
        
        if (DEBUG) console.log('Pond page loadUserData started');
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
            const effectiveSingle = sponsoredSingles.length > 0 ? sponsoredSingles[0] : null;
            // Always set currentSponsoredSingle - use first single if available, otherwise null
            // Only update if not already set (preserve user's selection when navigating back)
            setCurrentSponsoredSingle(prev => {
                if (prev && sponsoredSingles.some(s => s.id === prev.id)) return prev;
                return effectiveSingle;
            });
            return effectiveSingle;
        } catch (error) {
            console.error('Error in loadUserData:', error);
            return null;
        }
    };

    const loadProfiles = async (isLoadMore = false, currentPage = page, forceRefresh = false, selectedSingleIdOverride?: string | null) => {
        const effectiveSingleId = selectedSingleIdOverride !== undefined ? selectedSingleIdOverride : currentSponsoredSingle?.id;
        if (DEBUG) console.log('Pond page loadProfiles called with:', { isLoadMore, currentPage, page, forceRefresh, selectedSingleIdOverride });
        
        // If we have cached data and this isn't a forced refresh, show cached data immediately
        if (!forceRefresh && !isLoadMore) {
            const cacheKey = getCacheKey(effectiveSingleId ?? undefined);
            const cached = loadFromCache(cacheKey);
            if (cached && cached.profiles.length > 0) {
                if (DEBUG) console.log('Showing cached data immediately');
                cacheKeyRef.current = cacheKey;
                setProfiles(cached.profiles);
                setPage(cached.page);
                setHasMore(cached.hasMore);
                setSearchCity(cached.searchCity);
                setSearchState(cached.searchState);
                setSearchZip(cached.searchZip);
                setSelectedInterests(cached.selectedInterests);
                setLoading(false);
                
                // REMOVED: restoreScrollPosition(cached.scrollPosition);
                // Scroll restoration only happens in main useEffect (line 191) to avoid double restore
                
                // Load fresh data in background using requestIdleCallback for better performance
                // Fallback to immediate execution if requestIdleCallback is not available
                if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                    requestIdleCallback(() => {
                        loadProfiles(false, 1, true);
                    }, { timeout: 2000 });
                } else {
                    // Fallback: use setTimeout with 0 delay to run after current execution
                    setTimeout(() => {
                        loadProfiles(false, 1, true);
                    }, 0);
                }
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
            
            // Use the new optimized API endpoint (selected_single_id passed for Step 2 filtering, not used yet)
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: ITEMS_PER_PAGE.toString(),
                city: searchCity,
                state: searchState,
                zip: searchZip,
                selected_single_id: effectiveSingleId || '',
                interests: JSON.stringify(selectedInterests)
            });

            const response = await fetch(`/api/profiles/pond?${params}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const data = await response.json();

            if (DEBUG) console.log('Pond page received data:', { success: data.success, profilesCount: data.profiles?.length || 0, error: data.error });

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
            
            if (DEBUG) console.log('Pond page profiles updated:', { profilesCount: data.profiles?.length || 0, loading: false });
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
        setSelectedInterests([]);
        setPage(1);
        loadProfiles(false, 1);
    };

    const handleSearchFromModal = () => {
        setPage(1);
        setShowTailorSearchModal(false);
        loadProfiles(false, 1);
    };

    // Handler to open chat modal and fetch matchmakr info
    const handleOpenChat = async (profile: PondProfile) => {
        if (!profile.sponsored_by_id) return;
        
        // Always show modal to allow selection
        // If no singles, modal will show "You have no singles yet" and "Someone Else!" option
        setPendingChatProfile(profile);
        setShowSelectSingleModal(true);
    };

    const openChatWithSingle = async (profile: PondProfile, singleId: string | null) => {
        if (!profile.sponsored_by_id || !user) return;
        
        // Ensure singleId is provided or we have at least one sponsored single
        // We'll validate the specific singleId against sponsoredSingles below
        if (!singleId && sponsoredSingles.length === 0) {
            console.error('No sponsored singles available and no singleId provided');
            return;
        }
        
        // Use provided singleId, or fall back to first sponsored single if available
        const aboutSingleId = singleId || (sponsoredSingles.length > 0 ? sponsoredSingles[0].id : null);
        
        if (!aboutSingleId) {
            console.error('No valid single ID available');
            return;
        }
        
        const aboutSingleObj = sponsoredSingles.find(s => s.id === aboutSingleId);
        
        // Guard: only proceed if aboutSingleId is a valid sponsored single
        if (!aboutSingleObj) {
            console.error('Invalid single ID:', aboutSingleId);
            return;
        }
        
        // Fetch the matchmakr's info
        const { data: matchmakr, error: matchmakrError } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('id', profile.sponsored_by_id)
            .single();
        
        if (matchmakrError || !matchmakr) {
            console.error('Error fetching matchmakr info:', matchmakrError);
            return;
        }
        
        setSelectedSingleForChat(profile.id);
        setClickedSingleForChat({
            id: matchmakr.id,
            name: matchmakr.name,
            photo: matchmakr.photos && matchmakr.photos.length > 0 ? matchmakr.photos[0] : null
        });
        
        setAboutSingleForChat({ id: aboutSingleObj.id, name: aboutSingleObj.name, photo: aboutSingleObj.photo });
        
        // Create or find conversation
        // Use user.id from useAuth() instead of currentUser.id to avoid race condition
        const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('initiator_matchmakr_id', user.id < profile.sponsored_by_id ? user.id : profile.sponsored_by_id)
            .eq('recipient_matchmakr_id', user.id < profile.sponsored_by_id ? profile.sponsored_by_id : user.id)
            .eq('about_single_id', aboutSingleId)
            .eq('clicked_single_id', profile.id)
            .maybeSingle();
        
        if (conversation) {
            router.push(`/dashboard/chat/${conversation.id}`);
        } else {
            // Create new conversation
            const { data } = await supabase
                .from('conversations')
                .insert({
                    initiator_matchmakr_id: user.id < profile.sponsored_by_id ? user.id : profile.sponsored_by_id,
                    recipient_matchmakr_id: user.id < profile.sponsored_by_id ? profile.sponsored_by_id : user.id,
                    about_single_id: aboutSingleId,
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
        if (!pendingChatProfile) return;
        
        // Only proceed if singleId is a valid sponsored single
        const selectedSingle = sponsoredSingles.find(s => s.id === singleId);
        if (!selectedSingle) {
            console.error('Invalid single ID selected:', singleId);
            return;
        }
        
        // Update currentSponsoredSingle with the selected single
        setCurrentSponsoredSingle(selectedSingle);
        await openChatWithSingle(pendingChatProfile, singleId);
    };

    const handleInviteSingle = () => {
        setShowSelectSingleModal(false);
        setShowInviteSingleModal(true);
    };

    const handleCloseChat = () => {
        setShowSelectSingleModal(false);
        setPendingChatProfile(null);
    };

    // Handle opening send preview modal
    const handleOpenSendPreview = (profile: PondProfile) => {
        setSelectedTargetForPreview(profile);
        setShowSendPreviewModal(true);
    };

    // Handle sending preview
    const handleSendPreview = async (recipientSingleId: string) => {
        if (!selectedTargetForPreview) return;

        try {
            const response = await fetch('/api/sneak-peeks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientSingleId,
                    targetSingleId: selectedTargetForPreview.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific error messages
                let errorMessage = data.error || 'Failed to send preview';
                
                // Check if it's the 5 active previews limit
                if (errorMessage.includes('5 active') || errorMessage.includes('Maximum of 5')) {
                    errorMessage = 'They already have 5 previews right now. Try again later.';
                }
                
                setToast({ message: errorMessage, type: 'error' });
                return;
            }

            // Success
            setToast({ message: 'Preview sent', type: 'success' });
            setShowSendPreviewModal(false);
            setSelectedTargetForPreview(null);
        } catch (error) {
            console.error('Error sending preview:', error);
            setToast({ message: 'Failed to send preview. Please try again.', type: 'error' });
        }
    };

    if (DEBUG) console.log('Pond page render state:', { loading: loading || authLoading, profilesCount: profiles.length, hasMore });

    // Show loading while auth is loading or if we're still loading data
    if (authLoading || (loading && profiles.length === 0 && !showingCachedData)) {
        return (
            <div className="min-h-screen bg-transparent text-orbit-text p-4 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
                    <p className="mt-4 text-orbit-text">Loading...</p>
                </div>
            </div>
        );
    }

    // Handler for single selection that resets feed and scrolls to top
    const handleSingleSelect = (single: { id: string, name: string, photo: string | null }) => {
        setCurrentSponsoredSingle(single);
        setPage(1);
        loadProfiles(false, 1, false, single.id);
        window.scrollTo(0, 0);
    };

    return (
        <RequireStandaloneGate
            enabled={REQUIRE_STANDALONE_ENABLED}
            title="Install Orbit to use Discover"
            body="Discover is available in app mode only. Install Orbit to keep browsing."
            showBackButton={true}
        >
        <div className="min-h-screen bg-transparent text-orbit-text px-0 md:px-4">
            <div className="max-w-none md:max-w-6xl md:mx-auto">
                {/* Sticky Banner — orbit-surface-strong for hierarchy */}
                <div className="sticky top-0 z-50 orbit-surface-strong shadow-sm">
                    <div className="px-4 md:px-0">
                        <div className="max-w-none md:max-w-6xl md:mx-auto">
                            {/* Row 1: Always visible - "Here for:" + selected single */}
                            <div className="flex items-center gap-3 py-3">
                                <span className="text-orbit-text font-semibold text-base tracking-wide uppercase">Here for:</span>
                                {currentSponsoredSingle ? (
                                    <div className="flex items-center gap-2">
                                        {currentSponsoredSingle.photo ? (
                                            <img 
                                                src={currentSponsoredSingle.photo} 
                                                alt={currentSponsoredSingle.name} 
                                                className="w-8 h-8 rounded-full object-cover border border-border-light"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full orbit-surface border border-orbit-border/50 flex items-center justify-center">
                                                <span className="text-orbit-text font-bold text-xs">
                                                    {currentSponsoredSingle.name?.charAt(0).toUpperCase() || '?'}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-orbit-text font-medium text-sm">{currentSponsoredSingle.name}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowInviteSingleModal(true)}
                                        className="orbit-ring px-3 py-1 rounded-lg bg-orbit-gold text-orbit-bg-start hover:bg-orbit-goldDark font-medium transition-colors text-sm shadow-sm hover:shadow-md"
                                    >
                                        Invite a single
                                    </button>
                                )}
                            </div>
                            {/* Row 2: Only visible at top - Other singles + Invite button */}
                            {!isScrolled && currentSponsoredSingle && (
                                <div className="flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-2.5 -mx-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {/* Other single pills */}
                                    {sponsoredSingles.length > 1 && (
                                        <>
                                            {sponsoredSingles.map((single) => (
                                                <button
                                                    key={single.id}
                                                    onClick={() => handleSingleSelect(single)}
                                                    className={`px-3 py-1 rounded-lg border transition-colors text-sm flex-shrink-0 ${
                                                        currentSponsoredSingle.id === single.id
                                                            ? 'orbit-surface border-orbit-border text-orbit-text ring-2 ring-orbit-gold/50'
                                                            : 'orbit-surface border-orbit-border/50 text-orbit-text2 hover:bg-orbit-border/20'
                                                    }`}
                                                >
                                                    {single.name}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {/* Invite button */}
                                    <button
                                        onClick={() => setShowInviteSingleModal(true)}
                                        className="orbit-btn-secondary px-3 py-1 text-sm flex-shrink-0 shadow-sm"
                                    >
                                        Invite a single
                                    </button>
                                    {/* Tailor Search button */}
                                    <button
                                        onClick={() => setShowTailorSearchModal(true)}
                                        className="orbit-btn-secondary px-3 py-1 text-sm flex-shrink-0 shadow-sm"
                                    >
                                        Tailor Search
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
                        <p className="mt-4 text-orbit-text">Loading profiles...</p>
                    </div>
                ) : profiles.length === 0 ? (
                    <div className="text-center py-8">
                        {currentSponsoredSingle ? (
                            <>
                                <p className="text-orbit-text text-lg">
                                    No sponsored singles match {currentSponsoredSingle.name}&apos;s criteria in this community yet.
                                </p>
                                <p className="text-orbit-muted mt-2">Orbit is still growing — help shape it by inviting someone.</p>
                                <button
                                    onClick={() => setShowInviteSingleModal(true)}
                                    className="orbit-ring mt-4 rounded-cta min-h-[44px] px-6 py-2 bg-orbit-gold text-orbit-bg-start hover:bg-orbit-goldDark font-semibold shadow-cta-entry transition-colors duration-200"
                                >
                                    Invite a single
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-orbit-text text-lg">No singles found matching your criteria.</p>
                                <p className="text-orbit-muted mt-2">Try adjusting your search filters.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div>
                        <div key={`profiles-${profiles.length}`} className="flex flex-col gap-14 lg:grid lg:grid-cols-2 lg:gap-14">
                            {profiles.map((profile) => {
                                const age = calculateAge(profile);
                                const sponsorName = profile.sponsor_name || 'Sponsor';
                                const sponsorPhotoUrl = profile.sponsor_photo_url;
                                const hasEndorsement = profile.matchmakr_endorsement && profile.matchmakr_endorsement.trim().length > 0;
                                return (
                                    <Link href={`/profile/${profile.id}`} key={profile.id} className="block relative">
                                        <div className="md:rounded-2xl overflow-hidden orbit-surface shadow-card">
                                            {/* A) Hero — Pond-specific: large photo, Name/Age overlay, optional occupation */}
                                            <div className="relative w-full aspect-[4/5] md:aspect-[1/1]">
                                                {profile.profile_pic_url ? (
                                                    <img 
                                                        src={profile.profile_pic_url} 
                                                        alt={profile.name || 'Profile'} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center orbit-surface border border-orbit-border/50">
                                                        <span className="text-6xl font-bold text-orbit-text">{profile.name?.charAt(0).toUpperCase() || '?'}</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
                                                <div className="absolute bottom-5 left-4 right-4 z-10 text-on-dark-overlay pb-1">
                                                    <div className="text-on-dark-overlay font-bold text-2xl mb-1">
                                                        {profile.name}{age ? `, ${age}` : ''}
                                                    </div>
                                                    {profile.occupation && (
                                                        <div className="text-on-dark-overlay text-sm opacity-90">{profile.occupation}</div>
                                                    )}
                                                </div>
                                                <button
                                                    className="absolute bottom-5 right-4 z-10 px-3 py-1.5 rounded-full text-on-dark-overlay text-xs font-medium bg-white/20 backdrop-blur-sm border border-white/25 hover:bg-white/30 active:scale-95 transition-colors"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenSendPreview(profile); }}
                                                >
                                                    Send preview
                                                </button>
                                            </div>
                                            {/* Content: endorsement (outside gradient zone) */}
                                            {hasEndorsement && (
                                                <div className="px-4 sm:px-6 md:px-8 pt-5 pb-2">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h2 className="text-orbit-text text-base font-semibold">Why I&apos;d introduce them</h2>
                                                            <div className="flex items-center gap-2">
                                                                {sponsorPhotoUrl ? (
                                                                    <img src={sponsorPhotoUrl} alt={sponsorName} className="w-6 h-6 rounded-full object-cover border border-orbit-border/50 shrink-0" />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded-full bg-orbit-surface/80 border border-orbit-border/50 flex items-center justify-center shrink-0">
                                                                        <span className="text-orbit-text font-bold text-[9px]">{sponsorName.charAt(0).toUpperCase()}</span>
                                                                    </div>
                                                                )}
                                                                <span className="text-orbit-text2 text-sm whitespace-nowrap">{sponsorName}</span>
                                                            </div>
                                                        </div>
                                                        <div className="relative pt-1.5 pb-1.5 pl-3 pr-4">
                                                            <span aria-hidden className="pointer-events-none select-none absolute left-0 top-0 text-orbit-muted text-3xl leading-none" style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}>"</span>
                                                            <p className="text-orbit-text2 text-base font-normal leading-snug">{profile.matchmakr_endorsement}</p>
                                                            <span aria-hidden className="pointer-events-none select-none absolute right-0 bottom-0 text-orbit-muted text-3xl leading-none" style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}>"</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Action zone: pairings → intro → interests → coordinate (solid, no gradient) */}
                                            <div className="bg-black/10">
                                                <div className={`px-4 sm:px-6 md:px-8 space-y-4 ${hasEndorsement ? 'pt-4 pb-2' : 'pt-5 pb-2'}`}>
                                                    <div className="-mt-1">
                                                        <PairingsSection
                                                            profileId={profile.id}
                                                            pairingsSignal={profile.pairings_signal}
                                                            canEdit={false}
                                                            viewerIsProfileOwner={false}
                                                            compact={true}
                                                        />
                                                    </div>
                                                    <div className="-mt-2">
                                                        <IntroductionSignalSection
                                                            introductionSignal={profile.introduction_signal}
                                                            firstName={profile.name?.split(' ')[0] || ''}
                                                            profileId={profile.id}
                                                            profileName={profile.name}
                                                            canEdit={false}
                                                            viewerIsProfileOwner={false}
                                                            compact={true}
                                                        />
                                                    </div>
                                                    {profile.interests && profile.interests.length > 0 && (
                                                        <div className="-mt-1">
                                                            <div className="text-orbit-muted text-sm font-medium mb-1.5">Interests</div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {profile.interests.slice(0, 6).map((interest) => (
                                                                    <span key={interest.id} className="orbit-surface-soft px-2.5 py-0.5 rounded-full text-xs font-medium text-orbit-text2">
                                                                        {interest.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* C) Action rail — attached to profile, single primary action */}
                                            <div className="pt-4 pb-3 px-6 md:px-10 flex items-center justify-between gap-3 orbit-surface">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {sponsorPhotoUrl ? (
                                                        <img 
                                                            src={sponsorPhotoUrl} 
                                                            alt={sponsorName} 
                                                            className="w-9 h-9 rounded-full object-cover shrink-0" 
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-orbit-surface/80 flex items-center justify-center shrink-0">
                                                            <span className="text-orbit-text2 font-bold text-xs">
                                                                {sponsorName.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="text-orbit-muted text-sm">Coordinate with {sponsorName}</span>
                                                </div>
                                                {profile.sponsored_by_id && (
                                                    <button
                                                        className="orbit-btn-primary shrink-0 min-h-[44px] px-5 py-2.5 text-sm rounded-full font-semibold active:scale-95"
                                                        onClick={(e) => { e.preventDefault(); handleOpenChat(profile); }}
                                                    >
                                                        Message Sponsor
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* Separator dot between profiles (placeholder for logo) */}
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-7 flex justify-center pointer-events-none">
                                            <div className="w-2.5 h-2.5 rounded-full bg-orbit-border/70" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* Load More Button */}
                {!loading && hasMore && (
                    <div className="text-center mt-8 px-4 md:px-0">
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="orbit-btn-primary min-h-[48px] px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingMore ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orbit-text"></div>
                                    Loading more...
                                </div>
                            ) : (
                                'Load More Singles'
                            )}
                        </button>
                    </div>
                )}
                
                {/* Footer spacer with brand mark */}
                <DashboardFooterSpacer />
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
                otherMatchmakrName="this Sponsor"
                currentUserId={user?.id}
                otherUserId={pendingChatProfile?.sponsored_by_id || undefined}
                clickedSingleId={pendingChatProfile?.id || undefined}
                currentSelectedSingleId={currentSponsoredSingle?.id}
                onInviteSingle={handleInviteSingle}
            />

            {/* Invite Single Modal */}
            <InviteSingleModal
                open={showInviteSingleModal}
                onClose={() => setShowInviteSingleModal(false)}
            />

            {/* Send Preview Modal */}
            <SendPreviewModal
                open={showSendPreviewModal}
                onClose={() => {
                    setShowSendPreviewModal(false);
                    setSelectedTargetForPreview(null);
                }}
                targetSingleId={selectedTargetForPreview?.id || ''}
                targetSinglePhotoUrl={selectedTargetForPreview?.profile_pic_url || null}
                targetSingleName={selectedTargetForPreview?.name || null}
                sponsoredSingles={sponsoredSingles}
                onSend={handleSendPreview}
            />

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    isVisible={!!toast}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Tailor Search Modal */}
            {showTailorSearchModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTailorSearchModal(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Tailor Search</h2>
                            <button
                                onClick={() => setShowTailorSearchModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Location fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="modal-city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        id="modal-city"
                                        value={searchCity}
                                        onChange={(e) => setSearchCity(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:border-accent-teal-light focus:outline-none focus:ring-2 focus:ring-accent-teal-light focus:ring-opacity-50"
                                        placeholder="e.g., New York"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="modal-state" className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input
                                        type="text"
                                        id="modal-state"
                                        value={searchState}
                                        onChange={(e) => setSearchState(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:border-accent-teal-light focus:outline-none focus:ring-2 focus:ring-accent-teal-light focus:ring-opacity-50"
                                        placeholder="e.g., NY"
                                    />
                                </div>
                            </div>

                            {/* Interest filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Interests</label>
                                <div className="bg-background-card border border-border-light rounded-md p-3">
                                    <InterestsInput
                                        value={selectedInterests}
                                        onChange={setSelectedInterests}
                                    />
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleSearchFromModal}
                                    className="flex-1 rounded-cta min-h-[44px] px-6 py-2 bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200"
                                >
                                    Search
                                </button>
                                <button
                                    onClick={() => {
                                        handleClearSearch();
                                        setShowTailorSearchModal(false);
                                    }}
                                    className="flex-1 rounded-cta min-h-[44px] px-6 py-2 bg-action-secondary text-primary-blue font-semibold hover:bg-action-secondary-hover focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </RequireStandaloneGate>
    );
}
