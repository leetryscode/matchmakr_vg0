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
  const selectedSingleId = searchParams.get('selected_single_id') || '';
  const selectedInterests = searchParams.get('interests') ? JSON.parse(searchParams.get('interests')!) : [];

  try {
    // Require selected_single_id for filtered Pond; return empty list if missing
    if (!selectedSingleId || selectedSingleId.trim() === '') {
      return NextResponse.json({
        success: true,
        profiles: [],
        hasMore: false,
        total: 0,
      });
    }

    const { data: profiles, error } = await supabase.rpc('get_pond_candidates', {
      selected_single_id: selectedSingleId,
      page,
      limit,
      city: searchCity.trim() || null,
      state: searchState.trim() || null,
      zip: searchZip.trim() || null,
    });

    if (error) {
      console.error('Pond API get_pond_candidates error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const profileIds = (profiles || []).map((p: { id: string }) => p.id);

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
    type PondRow = { id: string; photos: string[] | null; sponsored_by_id: string | null; [k: string]: unknown };
    const transformedProfiles = (profiles || []).map((profile: PondRow) => ({
      ...profile,
      profile_pic_url: profile.photos && profile.photos.length > 0 ? profile.photos[0] : null,
      interests: interestsMap.get(profile.id) || [],
      sponsor_name: sponsorMap.get(profile.sponsored_by_id)?.name || null,
      sponsor_photo_url: sponsorMap.get(profile.sponsored_by_id)?.photo_url || null
    }));

    // Rank profiles: those matching selected interests first, then the rest
    type TransformedProfile = { interests?: { id: number; name: string }[] };
    let rankedProfiles = transformedProfiles;
    if (selectedInterests.length > 0) {
      const selectedIds = selectedInterests.map((i: { id: number }) => i.id);
      rankedProfiles = [
        ...transformedProfiles.filter((p: TransformedProfile) =>
          p.interests && p.interests.some((interest: { id: number }) => selectedIds.includes(interest.id))
        ),
        ...transformedProfiles.filter((p: TransformedProfile) =>
          !p.interests || !p.interests.some((interest: { id: number }) => selectedIds.includes(interest.id))
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