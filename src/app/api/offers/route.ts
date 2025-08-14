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
        
        const { title, description, duration_days } = body;

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
                photos: [],
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