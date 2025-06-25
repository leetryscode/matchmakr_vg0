import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PhotoGallery from '@/components/profile/PhotoGallery';
import EditProfileModal from '@/components/profile/EditProfileModal';
import EditProfileButton from '@/components/profile/EditProfileButton';

// Function to calculate age from birth year
function calculateAge(birthYear: number | null): number | null {
    if (!birthYear) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
}

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
        redirect('/dashboard/matchmakr'); // Or a more generic not-found page
    }

    // Fetch sponsored singles if the profile is a MatchMakr
    let sponsoredSingles: { id: string; name: string | null; profile_pic_url: string | null }[] | null = null;
    if (profile.user_type === 'MATCHMAKR') {
        const { data } = await supabase
            .from('profiles')
            .select('id, name, profile_pic_url, photos')
            .eq('sponsored_by_id', profile.id)
            .eq('user_type', 'SINGLE');
        
        // Use the first photo from photos array if profile_pic_url is not available
        sponsoredSingles = data?.map(single => ({
            ...single,
            profile_pic_url: single.profile_pic_url || (single.photos && single.photos.length > 0 ? single.photos[0] : null)
        })) || null;
    }

    const isOwnProfile = currentUser?.id === profile.id;
    const isSponsorViewing = currentUser?.id === profile.sponsored_by_id;

    const age = calculateAge(profile.birth_year);
    const firstName = profile.name?.split(' ')[0] || '';

    return (
        <>
            <div className="min-h-screen bg-gradient-main p-4 sm:p-6 md:p-8">
                <div className="max-w-sm mx-auto bg-background-card rounded-2xl shadow-deep overflow-hidden border border-border-light">
                    <PhotoGallery 
                        userId={profile.id} 
                        photos={profile.photos}
                        userType={profile.user_type}
                    />

                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <h1 className="text-3xl font-bold text-text-dark">{profile.name}{age ? `, ${age}` : ''}</h1>
                            {isOwnProfile && (
                                <EditProfileButton profile={profile} />
                            )}
                        </div>
                        <p className="text-text-light mt-1">{profile.occupation || 'No occupation listed'}</p>
                        
                        <div className="mt-6 border-t border-border-light pt-4">
                             <h2 className="text-lg font-semibold text-primary-blue">About {firstName}</h2>
                             <p className="mt-2 text-sm text-text-dark">{profile.bio || 'No bio yet.'}</p>
                        </div>

                        {profile.user_type === 'SINGLE' && (
                            <div className="mt-6 border-t border-primary-teal border-opacity-30 pt-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-primary-teal">What their MatchMakr says</h2>
                                    {isSponsorViewing && (
                                        <EditProfileButton profile={profile} canEditEndorsementOnly={true} />
                                    )}
                                </div>
                                <p className="mt-2 text-sm text-text-dark">{profile.matchmakr_endorsement || 'This is where your matchmakr writes about you...'}</p>
                            </div>
                        )}

                        {profile.user_type === 'MATCHMAKR' && (
                            <div className="mt-6 border-t border-primary-teal border-opacity-30 pt-4">
                                <h2 className="text-lg font-semibold text-primary-teal">Sponsored Singles</h2>
                                {sponsoredSingles && sponsoredSingles.length > 0 ? (
                                    <div className="mt-4 grid grid-cols-3 gap-4">
                                        {sponsoredSingles.map(single => (
                                            <Link href={`/profile/${single.id}`} key={single.id} className="text-center group">
                                                <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-2 border-transparent group-hover:border-primary-blue transition-all duration-300">
                                                    {single.profile_pic_url ? (
                                                        <img src={single.profile_pic_url} alt={single.name || 'Single'} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-background-main flex items-center justify-center">
                                                            <span className="text-2xl font-bold text-text-light">
                                                                {single.name?.charAt(0).toUpperCase() || '?'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-sm font-semibold text-text-dark truncate group-hover:text-primary-blue">{single.name}</p>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm text-text-light">Not currently sponsoring any singles.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* The EditProfileModal will need to be triggered by a client component */}
            {/* {isOwnProfile && <EditProfileModal profile={profile} ... />} */}
        </>
    );
} 