drop policy "Users can update their own profile." on "public"."profiles";

drop policy "Users can insert their own profile." on "public"."profiles";

alter table "public"."profiles" drop column "profile_pic_url";

alter table "public"."profiles" add column "city" text;

alter table "public"."profiles" add column "state" text;

alter table "public"."profiles" add column "zip_code" text;

CREATE INDEX idx_profiles_location_search ON public.profiles USING btree (city, state, zip_code) WHERE (user_type = 'SINGLE'::user_role);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, user_type, created_at)
  values (new.id, 'SINGLE', now());
  return new;
end;
$function$
;

create policy "Allow authenticated read"
on "public"."profiles"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "profiles_update_policy"
on "public"."profiles"
as permissive
for update
to public
using (((auth.role() = 'authenticated'::text) AND ((auth.uid() = id) OR ((user_type = 'SINGLE'::user_role) AND (sponsored_by_id = auth.uid())))));


create policy "Users can insert their own profile."
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));



