import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/sneak-peeks?for=single&singleId=... OR ?for=sponsor&sponsorId=...
export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const forParam = searchParams.get('for');
        const singleId = searchParams.get('singleId');
        const sponsorId = searchParams.get('sponsorId');

        if (forParam === 'single') {
            // List sneak peeks for a single
            if (!singleId) {
                return NextResponse.json({ error: 'singleId is required' }, { status: 400 });
            }

            // Verify caller is the recipient single
            if (user.id !== singleId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // Query active sneak peeks: PENDING status and not expired
            // Use DB time comparison via SQL (expires_at > now())
            const { data: sneakPeeks, error } = await supabase
                .from('sneak_peeks')
                .select('*')
                .eq('recipient_single_id', singleId)
                .eq('status', 'PENDING')
                .gt('expires_at', new Date().toISOString()) // Client-side filter as fallback, but DB will also filter
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching sneak peeks for single:', error);
                return NextResponse.json({ error: 'Failed to fetch sneak peeks' }, { status: 500 });
            }

            return NextResponse.json({ success: true, sneakPeeks: sneakPeeks || [] });

        } else if (forParam === 'sponsor') {
            // List sneak peeks for a sponsor
            if (!sponsorId) {
                return NextResponse.json({ error: 'sponsorId is required' }, { status: 400 });
            }

            // Verify caller is the sponsor
            if (user.id !== sponsorId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // Query PENDING sneak peeks sent by sponsor
            // Optionally include responded ones (OPEN_TO_IT, NOT_SURE_YET) within last 48h
            // Note: We don't join recipient/target names here to avoid RLS issues.
            // UI should fetch names separately via existing sponsor-visible endpoints.

            // First get PENDING ones
            const { data: pendingPeeks, error: pendingError } = await supabase
                .from('sneak_peeks')
                .select('id, recipient_single_id, target_single_id, photo_url, status, created_at, expires_at, responded_at')
                .eq('from_sponsor_id', sponsorId)
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false });

            // Then get responded ones within last 48h (using DB time via SQL)
            const { data: respondedPeeks, error: respondedError } = await supabase
                .from('sneak_peeks')
                .select('id, recipient_single_id, target_single_id, photo_url, status, created_at, expires_at, responded_at')
                .eq('from_sponsor_id', sponsorId)
                .in('status', ['OPEN_TO_IT', 'NOT_SURE_YET'])
                .gt('responded_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false });

            if (pendingError || respondedError) {
                console.error('Error fetching sneak peeks for sponsor:', pendingError || respondedError);
                return NextResponse.json({ error: 'Failed to fetch sneak peeks' }, { status: 500 });
            }

            // Combine results
            const sneakPeeks = [...(pendingPeeks || []), ...(respondedPeeks || [])];

            return NextResponse.json({ success: true, sneakPeeks: sneakPeeks || [] });

        } else {
            return NextResponse.json({ error: 'Invalid "for" parameter. Use "single" or "sponsor"' }, { status: 400 });
        }

    } catch (error) {
        console.error('Unexpected error in GET /api/sneak-peeks:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/sneak-peeks - sendSneakPeek
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify caller is a sponsor (MATCHMAKR)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        if (profile.user_type !== 'MATCHMAKR') {
            return NextResponse.json({ error: 'Only sponsors can send sneak peeks' }, { status: 403 });
        }

        // Parse request body
        const body = await request.json();
        const { recipientSingleId, targetSingleId } = body;

        if (!recipientSingleId || !targetSingleId) {
            return NextResponse.json({ 
                error: 'Missing required fields: recipientSingleId, targetSingleId' 
            }, { status: 400 });
        }

        // Validate recipient and target exist and are SINGLE users
        const { data: singles, error: singlesError } = await supabase
            .from('profiles')
            .select('id, user_type, photos')
            .in('id', [recipientSingleId, targetSingleId]);

        if (singlesError || !singles || singles.length !== 2) {
            return NextResponse.json({ error: 'Recipient or target single not found' }, { status: 404 });
        }

        const recipient = singles.find(s => s.id === recipientSingleId);
        const target = singles.find(s => s.id === targetSingleId);

        if (!recipient || recipient.user_type !== 'SINGLE') {
            return NextResponse.json({ error: 'Recipient must be a SINGLE user' }, { status: 400 });
        }

        if (!target || target.user_type !== 'SINGLE') {
            return NextResponse.json({ error: 'Target must be a SINGLE user' }, { status: 400 });
        }

        // Check active sneak peek count (< 5)
        // Note: Race condition possible if two sends happen simultaneously.
        // For MVP, this is acceptable. Consider adding DB trigger or transaction locking later.
        const { count, error: countError } = await supabase
            .from('sneak_peeks')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_single_id', recipientSingleId)
            .eq('status', 'PENDING')
            .gt('expires_at', new Date().toISOString());

        if (countError) {
            console.error('Error checking active sneak peek count:', countError);
            return NextResponse.json({ error: 'Failed to check active sneak peek count' }, { status: 500 });
        }

        if (count !== null && count >= 5) {
            return NextResponse.json({ 
                error: 'Maximum of 5 active sneak peeks allowed. Please wait for some to expire or be responded to.' 
            }, { status: 400 });
        }

        // Fetch target single's first photo (snapshot)
        // Note: For MVP, we store the photo URL as-is. If using signed/expiring URLs,
        // consider storing storage path and generating signed URLs at read time.
        // If photos are public, this approach is fine.
        const photoUrl = target.photos && target.photos.length > 0 && target.photos[0] 
            ? target.photos[0] 
            : null;

        if (!photoUrl) {
            return NextResponse.json({ 
                error: 'Target single must have at least one photo' 
            }, { status: 400 });
        }

        // expires_at will be set automatically by database trigger (created_at + 48 hours)
        // No need to calculate it client-side - trigger ensures server-side consistency

        // Create sneak peek
        const { data: sneakPeek, error: createError } = await supabase
            .from('sneak_peeks')
            .insert({
                recipient_single_id: recipientSingleId,
                from_sponsor_id: user.id,
                target_single_id: targetSingleId,
                photo_url: photoUrl,
                status: 'PENDING'
                // expires_at is set by trigger, don't include it
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating sneak peek:', createError);
            return NextResponse.json({ error: 'Failed to create sneak peek' }, { status: 500 });
        }

        return NextResponse.json({ success: true, sneakPeek }, { status: 201 });

    } catch (error) {
        console.error('Unexpected error in POST /api/sneak-peeks:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

