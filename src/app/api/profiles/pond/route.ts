import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parseSelectedInterestIds(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{ id?: unknown }> | null;
    if (!Array.isArray(parsed)) return [];
    const ids = parsed
      .map((item) => Number(item?.id))
      .filter((id) => Number.isInteger(id) && id > 0);
    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}

function parseCommunityIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => UUID_PATTERN.test(item));
    return Array.from(new Set(normalized));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const admin = createServiceClient();
  const { searchParams } = new URL(req.url);

  const page = parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT);
  const searchCity = searchParams.get('city') || '';
  const searchState = searchParams.get('state') || '';
  const searchZip = searchParams.get('zip') || '';
  const selectedSingleId = (searchParams.get('selected_single_id') || '').trim();
  const selectedInterestIds = parseSelectedInterestIds(searchParams.get('interests'));
  // Phase B plumbing only: accepts optional UUID array, no UI wired yet.
  const communityIds = parseCommunityIds(searchParams.get('community_ids'));

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verified current schema: profiles.id references auth.users.id.
    // Keep sponsorship checks in profile-id domain after resolving caller profile.
    const { data: callerProfile, error: callerError } = await admin
      .from('profiles')
      .select('id, user_type')
      .eq('id', user.id)
      .maybeSingle();

    if (callerError) {
      console.error('Pond API caller profile lookup error:', callerError);
      return NextResponse.json({ success: false, error: 'Failed to resolve caller profile.' }, { status: 500 });
    }
    if (!callerProfile) {
      return NextResponse.json({ success: false, error: 'Profile not found.' }, { status: 404 });
    }
    if (callerProfile.user_type !== 'MATCHMAKR') {
      return NextResponse.json({ success: false, error: 'Only sponsors can access Pond.' }, { status: 403 });
    }

    // Require selected_single_id for filtered Pond; return empty list if missing
    if (!selectedSingleId) {
      return NextResponse.json({
        success: true,
        profiles: [],
        hasMore: false,
        total: 0,
      });
    }
    if (!UUID_PATTERN.test(selectedSingleId)) {
      return NextResponse.json({ success: false, error: 'Invalid selected_single_id.' }, { status: 400 });
    }

    const { data: selectedSingle, error: selectedSingleError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', selectedSingleId)
      .eq('user_type', 'SINGLE')
      .eq('sponsored_by_id', callerProfile.id)
      .maybeSingle();

    if (selectedSingleError) {
      console.error('Pond API selected single authorization check error:', selectedSingleError);
      return NextResponse.json({ success: false, error: 'Failed to authorize selected single.' }, { status: 500 });
    }
    if (!selectedSingle) {
      return NextResponse.json({ success: false, error: 'Unauthorized selected_single_id.' }, { status: 403 });
    }

    let sanitizedCommunityIds = communityIds;
    if (communityIds.length > 0) {
      const { data: sponsoredSingles, error: sponsoredSinglesError } = await admin
        .from('profiles')
        .select('id')
        .eq('sponsored_by_id', callerProfile.id)
        .eq('user_type', 'SINGLE');

      if (sponsoredSinglesError) {
        console.error('Pond API sponsored singles lookup error:', sponsoredSinglesError);
        return NextResponse.json({ success: false, error: 'Failed to authorize community filters.' }, { status: 500 });
      }

      const authorizedSourceProfileIds = [
        callerProfile.id,
        ...(sponsoredSingles ?? []).map((single) => single.id),
      ];

      const { data: authorizedMemberships, error: authorizedMembershipsError } = await admin
        .from('community_members')
        .select('community_id')
        .in('profile_id', authorizedSourceProfileIds);

      if (authorizedMembershipsError) {
        console.error('Pond API authorized memberships lookup error:', authorizedMembershipsError);
        return NextResponse.json({ success: false, error: 'Failed to authorize community filters.' }, { status: 500 });
      }

      const authorizedCommunityIds = new Set(
        (authorizedMemberships ?? []).map((membership) => membership.community_id)
      );
      sanitizedCommunityIds = communityIds.filter((communityId) => authorizedCommunityIds.has(communityId));
    }

    const { data: profiles, error } = await supabase.rpc('get_pond_candidates', {
      selected_single_id: selectedSingleId,
      page,
      limit,
      city: searchCity.trim() || null,
      state: searchState.trim() || null,
      zip: searchZip.trim() || null,
      selected_interest_ids: selectedInterestIds,
      community_ids: sanitizedCommunityIds,
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
        sponsors?.map((s) => [
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

    // Check if we have more data
    const hasMore = transformedProfiles.length === limit;

    return NextResponse.json({ 
      success: true, 
      profiles: transformedProfiles,
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