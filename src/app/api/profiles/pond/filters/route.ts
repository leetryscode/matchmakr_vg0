import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type SourceType = 'sponsor' | 'sponsored_single';

type Source = {
  source_type: SourceType;
  source_profile_id: string;
  source_profile_name: string;
};

type Option = {
  community_id: string;
  community_name: string;
  sources: Source[];
  source_count: number;
  is_shared: boolean;
};

function sortSources(a: Source, b: Source): number {
  if (a.source_type === 'sponsor' && b.source_type !== 'sponsor') return -1;
  if (a.source_type !== 'sponsor' && b.source_type === 'sponsor') return 1;

  const nameCompare = a.source_profile_name.localeCompare(b.source_profile_name, undefined, { sensitivity: 'base' });
  if (nameCompare !== 0) return nameCompare;
  return a.source_profile_id.localeCompare(b.source_profile_id);
}

function sortOptions(a: Option, b: Option): number {
  const nameCompare = a.community_name.localeCompare(b.community_name, undefined, { sensitivity: 'base' });
  if (nameCompare !== 0) return nameCompare;
  return a.community_id.localeCompare(b.community_id);
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createServiceClient();

    // Verified current schema: profiles.id references auth.users.id.
    // Keep all relationship checks in profile-id domain after this lookup.
    const { data: callerProfile, error: callerError } = await admin
      .from('profiles')
      .select('id, user_type')
      .eq('id', user.id)
      .maybeSingle();

    if (callerError) {
      console.error('[api/profiles/pond/filters] caller lookup error:', callerError);
      return NextResponse.json({ error: 'Failed to resolve caller profile.' }, { status: 500 });
    }
    if (!callerProfile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }
    if (callerProfile.user_type !== 'MATCHMAKR') {
      return NextResponse.json({ error: 'Only sponsors can access Pond filters.' }, { status: 403 });
    }

    const { data: sponsoredSingles, error: sponsoredError } = await admin
      .from('profiles')
      .select('id, name')
      .eq('sponsored_by_id', callerProfile.id)
      .eq('user_type', 'SINGLE');

    if (sponsoredError) {
      console.error('[api/profiles/pond/filters] sponsored singles lookup error:', sponsoredError);
      return NextResponse.json({ error: 'Failed to load sponsored singles.' }, { status: 500 });
    }

    const sourceByProfileId = new Map<string, Source>();
    sourceByProfileId.set(callerProfile.id, {
      source_type: 'sponsor',
      source_profile_id: callerProfile.id,
      source_profile_name: 'You',
    });

    for (const single of sponsoredSingles ?? []) {
      sourceByProfileId.set(single.id, {
        source_type: 'sponsored_single',
        source_profile_id: single.id,
        source_profile_name: (single.name || '').trim() || 'Single',
      });
    }

    const authorizedSourceProfileIds = Array.from(sourceByProfileId.keys());
    if (authorizedSourceProfileIds.length === 0) {
      return NextResponse.json({ success: true, sources: [], options: [] });
    }

    const { data: memberships, error: membershipError } = await admin
      .from('community_members')
      .select('profile_id, community_id')
      .in('profile_id', authorizedSourceProfileIds);

    if (membershipError) {
      console.error('[api/profiles/pond/filters] memberships lookup error:', membershipError);
      return NextResponse.json({ error: 'Failed to load community memberships.' }, { status: 500 });
    }

    const pairs = new Set<string>();
    const dedupedMemberships = (memberships ?? []).filter((membership) => {
      const key = `${membership.profile_id}:${membership.community_id}`;
      if (pairs.has(key)) return false;
      pairs.add(key);
      return true;
    });

    const communityIds = Array.from(new Set(dedupedMemberships.map((m) => m.community_id)));
    if (communityIds.length === 0) {
      const sources = Array.from(sourceByProfileId.values()).sort(sortSources);
      return NextResponse.json({ success: true, sources, options: [] });
    }

    const { data: communities, error: communitiesError } = await admin
      .from('communities')
      .select('id, name')
      .in('id', communityIds);

    if (communitiesError) {
      console.error('[api/profiles/pond/filters] communities lookup error:', communitiesError);
      return NextResponse.json({ error: 'Failed to load communities.' }, { status: 500 });
    }

    const communityById = new Map(
      (communities ?? [])
        .filter((community) => community?.id && community?.name)
        .map((community) => [community.id, community])
    );

    const optionSourcesByCommunityId = new Map<string, Map<string, Source>>();
    for (const membership of dedupedMemberships) {
      const community = communityById.get(membership.community_id);
      if (!community || !community.id || !community.name) {
        continue;
      }
      const source = sourceByProfileId.get(membership.profile_id);
      if (!source) {
        continue;
      }

      const sourceMap = optionSourcesByCommunityId.get(community.id) ?? new Map<string, Source>();
      sourceMap.set(source.source_profile_id, source);
      optionSourcesByCommunityId.set(community.id, sourceMap);
    }

    const options: Option[] = Array.from(optionSourcesByCommunityId.entries())
      .map(([communityId, sourceMap]) => {
        const community = communityById.get(communityId);
        if (!community) return null;

        const sources = Array.from(sourceMap.values()).sort(sortSources);
        return {
          community_id: community.id,
          community_name: community.name,
          sources,
          source_count: sources.length,
          is_shared: sources.length > 1,
        };
      })
      .filter((option): option is Option => option !== null)
      .sort(sortOptions);

    const allSources = Array.from(sourceByProfileId.values()).sort(sortSources);

    return NextResponse.json({
      success: true,
      sources: allSources,
      options,
    });
  } catch (error) {
    console.error('[api/profiles/pond/filters] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
