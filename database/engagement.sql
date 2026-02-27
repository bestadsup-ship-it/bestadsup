-- Engagement System: Comments, Notifications, Reactions
-- Note: Tables already exist, this file only adds missing columns/indexes/triggers

-- All tables already exist from previous migrations:
-- - comments (has: id, post_id, account_id, parent_comment_id, content, likes_count, replies_count, created_at, updated_at, deleted_at)
-- - comment_likes (has: id, account_id, comment_id, created_at)
-- - notifications (has: id, recipient_id, sender_id, type, post_id, comment_id, message, is_read, created_at)
-- - follows (has: id, follower_id, following_id, status, created_at)
-- - post_likes (has: id, post_id, account_id, created_at)
-- - post_saves (has: id, post_id, account_id, created_at)

-- Function to update comment count on posts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments = comments + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments = GREATEST(comments - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_count ON comments;
CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_likes_count();

-- Function to create notification (using existing table schema: recipient_id, sender_id, message)
CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't create notification for own actions
  IF NEW.account_id = (SELECT account_id FROM posts WHERE id = NEW.post_id) THEN
    RETURN NEW;
  END IF;

  -- Create notification for post owner
  INSERT INTO notifications (recipient_id, sender_id, type, post_id, comment_id, message)
  VALUES (
    (SELECT account_id FROM posts WHERE id = NEW.post_id),
    NEW.account_id,
    'comment',
    NEW.post_id,
    NEW.id,
    NEW.content
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comment_notification ON comments;
CREATE TRIGGER trigger_comment_notification
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION create_notification();

-- Add comment count column to posts if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='comments') THEN
    ALTER TABLE posts ADD COLUMN comments INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update existing comment counts
UPDATE posts p
SET comments = (
  SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id
) WHERE EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id);

-- Create all indexes after tables are created (matching existing schema)
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_account ON comments(account_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_account ON comment_likes(account_id);

-- Notifications uses recipient_id and sender_id (not account_id/actor_id)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_account ON post_likes(account_id);

CREATE INDEX IF NOT EXISTS idx_post_saves_post ON post_saves(post_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_account ON post_saves(account_id);
