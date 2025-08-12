-- Migration: Add vendor address fields for complete business addresses
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS street_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line_2 text;

-- Add comment to document the new fields
COMMENT ON COLUMN profiles.street_address IS 'Street address for business locations (VENDOR users)';
COMMENT ON COLUMN profiles.address_line_2 IS 'Additional address line (apartment, suite, etc.) for business locations'; 