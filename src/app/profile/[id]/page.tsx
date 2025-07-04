import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProfileClient from '@/components/profile/ProfileClient';
import { Profile } from '@/components/profile/types';

export default async function ProfilePage({ params }: { params: { id: string } }) {
    const cookieStore = cookies();
    const supabase = createClient();

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single();

    if (!profile) {
        redirect('/dashboard/matchmakr');
    }

    // Fetch sponsored singles if the profile is a MatchMakr
    let sponsoredSingles: { id: string; name: string | null; profile_pic_url: string | null }[] | null = null;
    let matchmakrProfile: { id: string; name: string | null; profile_pic_url: string | null } | null = null;
    if (profile.user_type === 'MATCHMAKR') {
        const { data } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('sponsored_by_id', profile.id)
            .eq('user_type', 'SINGLE');
        sponsoredSingles = data?.map(single => ({
            ...single,
            profile_pic_url: single.photos && single.photos.length > 0 ? single.photos[0] : null
        })) || null;
    }
    if (profile.user_type === 'SINGLE' && profile.sponsored_by_id) {
        const { data } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('id', profile.sponsored_by_id)
            .eq('user_type', 'MATCHMAKR')
            .single();
        if (data) {
            matchmakrProfile = {
                id: data.id,
                name: data.name,
                profile_pic_url: data.photos && data.photos.length > 0 ? data.photos[0] : null
            };
        }
    }

    const isOwnProfile = currentUser?.id === profile.id;
    const isSponsorViewing = currentUser?.id === profile.sponsored_by_id;

    // Fetch current user's profile for user_type
    let currentUserProfile: { user_type: string } | null = null;
    if (currentUser?.id) {
        const { data } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', currentUser.id)
            .single();
        if (data) {
            currentUserProfile = { user_type: data.user_type };
        }
    }

    // Fetch current user's sponsored single (if matchmakr)
    let currentSponsoredSingle: { id: string; name: string | null; photo: string | null } | null = null;
    if (currentUser?.id) {
        const { data } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('sponsored_by_id', currentUser.id)
            .eq('user_type', 'SINGLE')
            .single();
        if (data) {
            currentSponsoredSingle = {
                id: data.id,
                name: data.name,
                photo: data.photos && data.photos.length > 0 ? data.photos[0] : null
            };
        }
    }

    return (
        <ProfileClient
            profile={profile as Profile}
            sponsoredSingles={sponsoredSingles}
            matchmakrProfile={matchmakrProfile}
            isOwnProfile={isOwnProfile}
            isSponsorViewing={isSponsorViewing}
            currentUserProfile={currentUserProfile}
            currentSponsoredSingle={currentSponsoredSingle}
        />
    );
} 