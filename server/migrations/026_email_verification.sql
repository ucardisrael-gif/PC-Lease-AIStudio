ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
CREATE TABLE email_verifications (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 used_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX email_verifications_user ON email_verifications(user_id);
