CREATE TABLE request_notification_attempts (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 result TEXT NOT NULL CHECK (result IN ('sent','failed')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX request_notification_attempts_request ON request_notification_attempts(request_id,id DESC);
