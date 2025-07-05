-- Migration: Fix handle_new_user function to match current profiles schema
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_type, created_at)
  values (new.id, 'SINGLE', now());
  return new;
end;
$$ language plpgsql security definer; 