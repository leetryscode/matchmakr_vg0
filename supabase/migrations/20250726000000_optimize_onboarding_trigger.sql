-- Migration: Final working handle_new_user function for complete onboarding data
-- This migration handles all user types (SINGLE, MATCHMAKR, VENDOR) with all required fields
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    user_type, 
    name,
    sex,
    birth_year,
    bio,
    occupation,
    city,
    state,
    zip_code,
    business_name,
    industry,
    offer,
    matchmakr_endorsement,
    location,
    sponsored_by_id,
    created_at, 
    photos
  )
  values (
    new.id, 
    COALESCE(
      (new.raw_user_meta_data->>'user_type')::public.user_role, 
      'SINGLE'
    ),
    -- Basic profile info from onboarding
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'sex',
    (new.raw_user_meta_data->>'birth_year')::integer,
    
    -- Extended profile fields (can be filled later)
    new.raw_user_meta_data->>'bio',
    new.raw_user_meta_data->>'occupation',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'state',
    (new.raw_user_meta_data->>'zip_code')::text,
    
    -- Business fields (for VENDOR users)
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'industry',
    new.raw_user_meta_data->>'offer',
    
    -- MatchMakr specific fields
    new.raw_user_meta_data->>'matchmakr_endorsement',
    new.raw_user_meta_data->>'location',
    
    -- Relationship fields
    new.raw_user_meta_data->>'sponsored_by_id',
    
    -- System fields
    now(), 
    COALESCE(new.raw_user_meta_data->>'photos', '{}'::text[])
  );
  return new;
end;
$$ language plpgsql security definer; 