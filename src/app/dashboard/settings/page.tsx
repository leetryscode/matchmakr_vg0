import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EndSponsorshipSection from './EndSponsorshipSection';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  // Fetch the user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!profile || profile.user_type !== 'SINGLE') {
    redirect('/');
  }
  let sponsor = null;
  if (profile.sponsored_by_id) {
    const { data: sponsorProfile } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .eq('id', profile.sponsored_by_id)
      .single();
    if (sponsorProfile) {
      sponsor = {
        ...sponsorProfile,
        profile_pic_url: sponsorProfile.photos && sponsorProfile.photos.length > 0 ? sponsorProfile.photos[0] : null
      };
    }
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-primary-blue to-accent-teal-light p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      {sponsor ? (
        <EndSponsorshipSection sponsor={sponsor} />
      ) : (
        <div className="text-lg text-white/80">You do not currently have a MatchMakr.</div>
      )}
    </div>
  );
} 