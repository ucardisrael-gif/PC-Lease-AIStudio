CREATE TABLE inquiry_notification_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES contact_inquiries(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  result TEXT NOT NULL CHECK (result IN ('sent','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inquiry_notification_attempts_inquiry ON inquiry_notification_attempts(inquiry_id,id DESC);
