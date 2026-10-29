ALTER TABLE requests ADD COLUMN customer_link_version INTEGER NOT NULL DEFAULT 1 CHECK(customer_link_version>0);
CREATE INDEX requests_customer_user ON requests(customer_user_id);
CREATE TABLE request_customer_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
 old_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
 old_email TEXT,
 new_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
 new_email TEXT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX request_customer_history_request ON request_customer_history(request_id,id DESC);
