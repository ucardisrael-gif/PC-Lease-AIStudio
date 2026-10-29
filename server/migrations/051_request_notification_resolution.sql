CREATE TABLE request_notification_resolutions (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX request_notification_resolutions_request ON request_notification_resolutions(request_id,id DESC);
CREATE TRIGGER request_notification_resolutions_no_update_delete BEFORE UPDATE OR DELETE ON request_notification_resolutions FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
