-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'reply')),
  actor_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(account_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON notifications(post_id);

-- Function to create notification when someone likes a post
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if the liker is not the post author
  IF NEW.account_id != (SELECT account_id FROM posts WHERE id = NEW.post_id) THEN
    INSERT INTO notifications (account_id, type, actor_id, post_id)
    VALUES (
      (SELECT account_id FROM posts WHERE id = NEW.post_id),
      'like',
      NEW.account_id,
      NEW.post_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification when someone comments on a post
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if the commenter is not the post author
  IF NEW.account_id != (SELECT account_id FROM posts WHERE id = NEW.post_id) THEN
    INSERT INTO notifications (account_id, type, actor_id, post_id, comment_id, content)
    VALUES (
      (SELECT account_id FROM posts WHERE id = NEW.post_id),
      'comment',
      NEW.account_id,
      NEW.post_id,
      NEW.id,
      NEW.content
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification when someone follows you
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO notifications (account_id, type, actor_id)
    VALUES (
      NEW.following_id,
      'follow',
      NEW.follower_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_like_notification
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION create_like_notification();

CREATE TRIGGER trigger_comment_notification
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION create_comment_notification();

CREATE TRIGGER trigger_follow_notification
AFTER INSERT OR UPDATE ON follows
FOR EACH ROW
EXECUTE FUNCTION create_follow_notification();
