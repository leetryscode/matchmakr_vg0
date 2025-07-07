-- Migration: Ensure all profiles have photos arrays initialized
UPDATE profiles 
SET photos = '{}' 
WHERE photos IS NULL OR photos = '{}'::text[];

-- Also ensure the photos column has a default value for future inserts
ALTER TABLE profiles 
ALTER COLUMN photos SET DEFAULT '{}'; 