-- Migration: Fix handle_new_user function to use correct user_type from auth metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_type, created_at, photos)
  values (
    new.id, 
    COALESCE(
      (new.raw_user_meta_data->>'user_type')::public.user_role, 
      'SINGLE'
    ), 
    now(), 
    '{}'
  );
  return new;
end;
$$ language plpgsql security definer; 