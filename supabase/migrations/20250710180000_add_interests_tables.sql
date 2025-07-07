-- Migration: Add interests and profile_interests tables for normalized interests system

-- 1. Interests table
CREATE TABLE interests (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_by UUID, -- optional: who added it
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profile-Interests join table
CREATE TABLE profile_interests (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, interest_id)
);

-- 3. Seed with common interests
INSERT INTO interests (name) VALUES
('hiking'),
('biking'),
('cooking'),
('travel'),
('reading'),
('music'),
('sports'),
('movies'),
('yoga'),
('photography'); 