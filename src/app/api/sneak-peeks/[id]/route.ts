import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/sneak-peeks/[id] - respondToSneakPeek
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sneakPeekId = params.id;

        if (!sneakPeekId) {
            return NextResponse.json({ error: 'Sneak peek ID is required' }, { status: 400 });
        }

        // Parse request body
        const body = await request.json();
        const { status: newStatus } = body;

        // Validate status is one of the allowed response statuses
        // Reject PENDING and EXPIRED - these cannot be set by clients
        const allowedStatuses = ['OPEN_TO_IT', 'NOT_SURE_YET', 'DISMISSED'];
        const disallowedStatuses = ['PENDING', 'EXPIRED'];
        
        if (!newStatus || !allowedStatuses.includes(newStatus)) {
            return NextResponse.json({ 
                error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}. Cannot set PENDING or EXPIRED.` 
            }, { status: 400 });
        }
        
        if (disallowedStatuses.includes(newStatus)) {
            return NextResponse.json({ 
                error: `Status ${newStatus} cannot be set by clients` 
            }, { status: 400 });
        }

        // Fetch the sneak peek to verify ownership
        const { data: sneakPeek, error: fetchError } = await supabase
            .from('sneak_peeks')
            .select('*')
            .eq('id', sneakPeekId)
            .single();

        if (fetchError || !sneakPeek) {
            return NextResponse.json({ error: 'Sneak peek not found' }, { status: 404 });
        }

        // Verify caller is the recipient single
        if (user.id !== sneakPeek.recipient_single_id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update only status and responded_at (RLS policy enforces this, but we're explicit here)
        // Other fields (from_sponsor_id, recipient_single_id, target_single_id, photo_url, expires_at, created_at)
        // cannot be changed by recipients
        const { data: updatedSneakPeek, error: updateError } = await supabase
            .from('sneak_peeks')
            .update({
                status: newStatus,
                responded_at: new Date().toISOString()
                // Explicitly only updating these two fields - RLS WITH CHECK will enforce this
            })
            .eq('id', sneakPeekId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating sneak peek:', updateError);
            return NextResponse.json({ error: 'Failed to update sneak peek' }, { status: 500 });
        }

        return NextResponse.json({ success: true, sneakPeek: updatedSneakPeek });

    } catch (error) {
        console.error('Unexpected error in PATCH /api/sneak-peeks/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

