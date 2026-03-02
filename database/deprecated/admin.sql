-- Admin Role Support for BestAdsUp
-- Add admin capabilities to accounts

-- Add is_admin column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin checks
CREATE INDEX IF NOT EXISTS idx_accounts_admin ON accounts(is_admin);

-- Make the first account an admin (for initial setup)
-- You can change this email to your admin account
UPDATE accounts SET is_admin = TRUE WHERE email = 'admin@bestadsup.com';

-- Or make the first created account admin:
-- UPDATE accounts SET is_admin = TRUE WHERE id = (SELECT id FROM accounts ORDER BY created_at ASC LIMIT 1);
