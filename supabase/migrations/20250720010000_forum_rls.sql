-- Enable RLS
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_notifications ENABLE ROW LEVEL SECURITY;

-- Categories: Everyone can read
CREATE POLICY "Anyone can read categories" ON forum_categories FOR SELECT USING (true);

-- Posts: Everyone can read, authenticated users can insert, users can update/delete own posts
CREATE POLICY "Anyone can read posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON forum_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own posts" ON forum_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own posts" ON forum_posts FOR DELETE USING (auth.uid() = author_id);

-- Replies: Everyone can read, authenticated users can insert, users can update/delete own replies
CREATE POLICY "Anyone can read replies" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create replies" ON forum_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own replies" ON forum_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own replies" ON forum_replies FOR DELETE USING (auth.uid() = author_id);

-- Likes: Everyone can read, authenticated users can insert/delete own likes
CREATE POLICY "Anyone can read likes" ON forum_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create likes" ON forum_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON forum_likes FOR DELETE USING (auth.uid() = user_id);

-- Rate limits: Only the user can read/write their own
CREATE POLICY "User can read own rate limits" ON forum_rate_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can upsert own rate limits" ON forum_rate_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can update own rate limits" ON forum_rate_limits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "User can delete own rate limits" ON forum_rate_limits FOR DELETE USING (auth.uid() = user_id);

-- Notifications: Only the user can read/write their own
CREATE POLICY "User can read own notifications" ON forum_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own notifications" ON forum_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can update own notifications" ON forum_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "User can delete own notifications" ON forum_notifications FOR DELETE USING (auth.uid() = user_id); 