CREATE TABLE product_media (
 id TEXT PRIMARY KEY,
 data BYTEA NOT NULL CHECK (octet_length(data)>0 AND octet_length(data)<=4194304),
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
