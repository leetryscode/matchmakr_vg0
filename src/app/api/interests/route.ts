import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('interests')
    .select('*')
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ interests: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { name } = await req.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  // Check if interest exists (case-insensitive)
  const { data: existing, error: findError } = await supabase
    .from('interests')
    .select('*')
    .ilike('name', name);
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (existing && existing.length > 0) {
    return NextResponse.json({ interest: existing[0] });
  }
  // Insert new interest
  const { data: inserted, error: insertError } = await supabase
    .from('interests')
    .insert([{ name }])
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ interest: inserted });
} 