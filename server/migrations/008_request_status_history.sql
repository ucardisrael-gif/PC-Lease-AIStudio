CREATE TABLE request_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  previous_status TEXT NOT NULL CHECK (previous_status IN ('new', 'reviewed', 'closed')),
  new_status TEXT NOT NULL CHECK (new_status IN ('new', 'reviewed', 'closed')),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX request_status_history_request_id ON request_status_history(request_id, id);
