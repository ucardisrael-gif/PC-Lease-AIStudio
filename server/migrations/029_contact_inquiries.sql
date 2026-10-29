CREATE TABLE contact_inquiries (
  id TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','closed')),
  notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending','sent','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contact_inquiries_status_created ON contact_inquiries(status,created_at DESC,id DESC);
CREATE TABLE contact_inquiry_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES contact_inquiries(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contact_inquiry_history_inquiry ON contact_inquiry_history(inquiry_id,id DESC);
