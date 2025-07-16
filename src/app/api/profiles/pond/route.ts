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

  try {
    let query = supabase
      .from('profile_with_interests')
      .select('*')
      .range((page - 1) * limit, page * limit - 1);

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
      query = query.or(filters.join(','));
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Transform data to match expected format
    const transformedProfiles = (profiles || []).map(profile => ({
      ...profile,
      profile_pic_url: profile.photos && profile.photos.length > 0 ? profile.photos[0] : null,
      interests: profile.interest_names ? profile.interest_names.map((name: string, index: number) => ({
        id: profile.interest_ids[index],
        name: name
      })) : []
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