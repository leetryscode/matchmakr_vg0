import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/offers - Create a new offer
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is a vendor
        const { data: vendorProfile, error: vendorError } = await supabase
            .from('vendor_profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (vendorError || !vendorProfile) {
            return NextResponse.json({ error: 'User is not a vendor' }, { status: 403 });
        }

        // Parse request body
        const body = await request.json();
        
        const { title, description, duration_days, photos } = body;

        // Validate required fields
        if (!title || !description || !duration_days) {
            return NextResponse.json({ 
                error: 'Missing required fields: title, description, duration_days' 
            }, { status: 400 });
        }

        // Create the offer
        const { data: offer, error: createError } = await supabase
            .from('offers')
            .insert({
                vendor_id: user.id,
                title: title.trim(),
                description: description.trim(),
                duration_days,
                photos: photos || [], // Use photos from request or default to empty array
                is_active: true
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating offer:', createError);
            return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
        }

        return NextResponse.json({ offer }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/offers/[id] - Delete an offer
export async function DELETE(request: NextRequest) {
    try {
        const supabase = createClient();
        
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get offer ID from URL
        const url = new URL(request.url);
        const offerId = url.searchParams.get('id');
        
        if (!offerId) {
            return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
        }

        // Verify user owns this offer
        const { data: offer, error: offerError } = await supabase
            .from('offers')
            .select('vendor_id')
            .eq('id', offerId)
            .single();

        if (offerError || !offer) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }

        if (offer.vendor_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized to delete this offer' }, { status: 403 });
        }

        // Delete the offer
        const { error: deleteError } = await supabase
            .from('offers')
            .delete()
            .eq('id', offerId);

        if (deleteError) {
            console.error('Error deleting offer:', deleteError);
            return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 