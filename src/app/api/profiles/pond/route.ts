import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const searchCity = searchParams.get('city') || '';
  const searchState = searchParams.get('state') || '';
  const searchZip = searchParams.get('zip') || '';
  const selectedInterests = searchParams.get('interests') ? JSON.parse(searchParams.get('interests')!) : [];

  console.log('Pond API called with params:', { page, limit, searchCity, searchState, searchZip, selectedInterests });

  try {
    console.log('Pond API - starting request processing');

    // Query profiles directly (includes pairings_signal, introduction_signal, city, state, etc.)
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'SINGLE')
      .not('sponsored_by_id', 'is', null)
      .range((page - 1) * limit, page * limit - 1);

    // Build filter conditions for partial matches
    if (searchCity.trim() !== '') {
      query = query.ilike('city', `%${searchCity}%`);
    }
    if (searchState.trim() !== '') {
      query = query.ilike('state', `%${searchState}%`);
    }
    if (searchZip.trim() !== '') {
      query = query.ilike('zip_code', `%${searchZip}%`);
    }

    const { data: profiles, error } = await query;

    console.log('Pond API query result:', { profilesCount: profiles?.length || 0, error: error?.message });

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const profileIds = (profiles || []).map((p: any) => p.id);

    // Fetch interests for all profiles in a single batch query
    let interestsMap = new Map<string, { id: number; name: string }[]>();
    if (profileIds.length > 0) {
      const { data: profileInterests } = await supabase
        .from('profile_interests')
        .select('profile_id, interest_id, interests(id, name)')
        .in('profile_id', profileIds);

      for (const row of profileInterests || []) {
        const pi = row as unknown as { profile_id: string; interest_id: number; interests: { id: number; name: string } | { id: number; name: string }[] | null };
        const interest = Array.isArray(pi.interests) ? pi.interests[0] : pi.interests;
        if (interest) {
          const list = interestsMap.get(pi.profile_id) || [];
          list.push({ id: interest.id, name: interest.name });
          interestsMap.set(pi.profile_id, list);
        }
      }
    }

    // Fetch sponsor info for all profiles in a single batch query (no N+1)
    const sponsorIds = Array.from(new Set((profiles || []).map((p: any) => p.sponsored_by_id).filter(Boolean)));
    let sponsorMap = new Map();
    if (sponsorIds.length > 0) {
      const { data: sponsors } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .in('id', sponsorIds);

      sponsorMap = new Map(
        sponsors?.map(s => [
          s.id,
          {
            name: s.name || 'Sponsor',
            photo_url: s.photos && s.photos.length > 0 ? s.photos[0] : null
          }
        ]) || []
      );
    }

    // Transform data to match expected format
    const transformedProfiles = (profiles || []).map(profile => ({
      ...profile,
      profile_pic_url: profile.photos && profile.photos.length > 0 ? profile.photos[0] : null,
      interests: interestsMap.get(profile.id) || [],
      sponsor_name: sponsorMap.get(profile.sponsored_by_id)?.name || null,
      sponsor_photo_url: sponsorMap.get(profile.sponsored_by_id)?.photo_url || null
    }));

    // Rank profiles: those matching selected interests first, then the rest
    let rankedProfiles = transformedProfiles;
    if (selectedInterests.length > 0) {
      const selectedIds = selectedInterests.map((i: any) => i.id);
      rankedProfiles = [
        ...transformedProfiles.filter(p => 
          p.interests && p.interests.some((interest: any) => selectedIds.includes(interest.id))
        ),
        ...transformedProfiles.filter(p => 
          !p.interests || !p.interests.some((interest: any) => selectedIds.includes(interest.id))
        )
      ];
    }

    // Check if we have more data
    const hasMore = transformedProfiles.length === limit;

    return NextResponse.json({ 
      success: true, 
      profiles: rankedProfiles,
      hasMore,
      total: transformedProfiles.length
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 