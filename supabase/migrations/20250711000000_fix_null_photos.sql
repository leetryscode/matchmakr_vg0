-- Migration: Fix existing profiles with NULL photos
UPDATE profiles 
SET photos = '{}' 
WHERE photos IS NULL; 