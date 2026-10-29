CREATE TABLE site_blocks (
  block_key TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
