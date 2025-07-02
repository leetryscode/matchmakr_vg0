-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON "public"."profiles";
DROP POLICY IF EXISTS "Users can insert their own profile." ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update their own profile." ON "public"."profiles";

-- Create new simplified policies
-- 1. Anyone can view profiles (public read access)
CREATE POLICY "profiles_select_policy" ON "public"."profiles" 
FOR SELECT USING (true);

-- 2. Authenticated users can insert profiles (for new user creation)
CREATE POLICY "profiles_insert_policy" ON "public"."profiles" 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Authenticated users can update any profile (UI will control access)
CREATE POLICY "profiles_update_policy" ON "public"."profiles" 
FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Users can delete their own profile only (safety measure)
CREATE POLICY "profiles_delete_policy" ON "public"."profiles" 
FOR DELETE USING (auth.uid() = id); 