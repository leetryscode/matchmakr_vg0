-- Add new columns for unordered singles
ALTER TABLE conversations ADD COLUMN single_a_id uuid;
ALTER TABLE conversations ADD COLUMN single_b_id uuid;

-- Populate the new columns using the lower/higher of about_single_id and clicked_single_id
UPDATE conversations
SET single_a_id = LEAST(about_single_id, clicked_single_id),
    single_b_id = GREATEST(about_single_id, clicked_single_id);

-- Add a unique constraint on the unordered pair
ALTER TABLE conversations
ADD CONSTRAINT unique_single_pair UNIQUE (single_a_id, single_b_id); 