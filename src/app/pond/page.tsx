'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/components/profile/types';
import Link from 'next/link';

interface PondProfile extends Profile {
    profile_pic_url: string | null;
}

export default function PondPage() {
    const supabase = createClient();
    const [profiles, setProfiles] = useState<PondProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchCity, setSearchCity] = useState('');
    const [searchState, setSearchState] = useState('');
    const [searchZip, setSearchZip] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        checkUserAndLoadProfiles();
    }, []);

    const checkUserAndLoadProfiles = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/login';
            return;
        }

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

    return (
        <div className="min-h-screen bg-gradient-main p-4 sm:p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">The Pond</h1>
                    <p className="text-primary-blue">Find your single the perfect match!</p>
                    <p className="text-text-light mt-1">Message their MatchMakr to see if it's a good fit!</p>
                </div>

                {/* Search Filters */}
                <div className="bg-background-card rounded-xl p-6 mb-8 shadow-deep border border-accent-teal-light">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                                type="text"
                                id="city"
                                value={searchCity}
                                onChange={(e) => setSearchCity(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-background-card text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                                placeholder="e.g., New York"
                            />
                        </div>
                        <div>
                            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State</label>
                            <input
                                type="text"
                                id="state"
                                value={searchState}
                                onChange={(e) => setSearchState(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-background-card text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                                placeholder="e.g., NY"
                            />
                        </div>
                        <div>
                            <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                            <input
                                type="text"
                                id="zip"
                                value={searchZip}
                                onChange={(e) => setSearchZip(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-background-card text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                                placeholder="e.g., 10001"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSearch}
                            className="px-6 py-2 bg-gradient-primary text-white rounded-md hover:bg-primary-blue-light font-semibold transition-colors shadow-deep"
                        >
                            Search
                        </button>
                        <button
                            onClick={handleClearSearch}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="bg-background-card rounded-xl p-6 shadow-deep border border-border-light">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-primary-blue">
                            {loading ? 'Loading...' : `${profiles.length} singles found`}
                        </h2>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
                            <p className="mt-4 text-text-light">Loading profiles...</p>
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-text-light text-lg">No singles found matching your criteria.</p>
                            <p className="text-text-light mt-2">Try adjusting your search filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {profiles.map((profile) => {
                                const age = calculateAge(profile.birth_year);
                                return (
                                    <Link 
                                        href={`/profile/${profile.id}`} 
                                        key={profile.id}
                                        className="group block"
                                    >
                                        <div className="bg-background-main rounded-lg p-4 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border-light group-hover:border-primary-blue">
                                            {/* Profile Picture */}
                                            <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-2 border-accent-teal-light group-hover:border-primary-blue transition-all duration-300">
                                                {profile.profile_pic_url ? (
                                                    <img 
                                                        src={profile.profile_pic_url} 
                                                        alt={profile.name || 'Profile'} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                        <span className="text-2xl font-bold text-gray-400">
                                                            {profile.name?.charAt(0).toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Profile Info */}
                                            <div className="text-center">
                                                <h3 className="font-semibold text-text-dark group-hover:text-primary-blue transition-colors">
                                                    {profile.name}{age ? `, ${age}` : ''}
                                                </h3>
                                                {profile.occupation && (
                                                    <p className="text-sm text-text-light mt-1">{profile.occupation}</p>
                                                )}
                                                {(profile.city || profile.state || profile.zip_code) && (
                                                    <p className="text-sm text-text-light mt-1">
                                                        📍 {[profile.city, profile.state].filter(Boolean).join(', ')}
                                                        {profile.zip_code && ` ${profile.zip_code}`}
                                                    </p>
                                                )}
                                                {profile.bio && (
                                                    <p className="text-sm text-text-light mt-2 line-clamp-2">
                                                        {profile.bio}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
