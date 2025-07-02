-- Add structured location fields to profiles table
ALTER TABLE profiles 
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN zip_code TEXT;

-- Create an index for efficient location-based queries
CREATE INDEX idx_profiles_location_search ON profiles(city, state, zip_code) WHERE user_type = 'SINGLE';

-- Add a comment to document the location fields
COMMENT ON COLUMN profiles.city IS 'City name for geographic search';
COMMENT ON COLUMN profiles.state IS 'State name for geographic search';
COMMENT ON COLUMN profiles.zip_code IS 'ZIP code for geographic search'; 