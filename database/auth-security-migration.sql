-- Migration: Add security fields for account lockout and failed login tracking
-- Description: Adds fields to track failed login attempts and account lockout status

-- Add security columns to accounts table if they don't exist
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Add index for efficient lockout queries
CREATE INDEX IF NOT EXISTS idx_accounts_locked_until ON accounts(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_email_lower ON accounts(LOWER(email));

-- Add comments for documentation
COMMENT ON COLUMN accounts.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN accounts.last_failed_login IS 'Timestamp of the last failed login attempt';
COMMENT ON COLUMN accounts.locked_until IS 'Account is locked until this timestamp';
COMMENT ON COLUMN accounts.last_login IS 'Timestamp of the last successful login';

-- Update existing accounts to have default values
UPDATE accounts
SET failed_login_attempts = 0
WHERE failed_login_attempts IS NULL;
