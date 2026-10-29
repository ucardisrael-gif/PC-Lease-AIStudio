CREATE TABLE inquiry_notification_resolutions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES contact_inquiries(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inquiry_notification_resolutions_inquiry ON inquiry_notification_resolutions(inquiry_id,id DESC);
CREATE TRIGGER inquiry_notification_resolutions_no_update_delete BEFORE UPDATE OR DELETE ON inquiry_notification_resolutions FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
