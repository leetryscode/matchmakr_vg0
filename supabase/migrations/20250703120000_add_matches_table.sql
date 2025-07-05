-- Create matches table for single-to-single matches with matchmakr approval
CREATE TABLE matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    single_a_id uuid NOT NULL REFERENCES profiles(id),
    single_b_id uuid NOT NULL REFERENCES profiles(id),
    matchmakr_a_id uuid NOT NULL REFERENCES profiles(id),
    matchmakr_b_id uuid NOT NULL REFERENCES profiles(id),
    matchmakr_a_approved boolean NOT NULL DEFAULT false,
    matchmakr_b_approved boolean NOT NULL DEFAULT false,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (single_a_id, single_b_id)
); 