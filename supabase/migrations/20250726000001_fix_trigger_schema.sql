-- Migration: Fix trigger function to match actual database schema
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    user_type, 
    name,
    sex,
    birth_year,
    created_at, 
    photos
  )
  values (
    new.id, 
    COALESCE(
      (new.raw_user_meta_data->>'user_type')::public.user_role, 
      'SINGLE'
    ),
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'sex',
    (new.raw_user_meta_data->>'birth_year')::integer,
    now(), 
    '{}'
  );
  return new;
end;
$$ language plpgsql security definer; 