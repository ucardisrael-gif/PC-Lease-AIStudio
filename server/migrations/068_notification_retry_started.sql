ALTER TABLE requests ADD COLUMN notification_pending_at timestamptz;
ALTER TABLE contact_inquiries ADD COLUMN notification_pending_at timestamptz;
ALTER TABLE request_notification_attempts DROP CONSTRAINT request_notification_attempts_result_check;
ALTER TABLE request_notification_attempts ADD CONSTRAINT request_notification_attempts_result_check CHECK (result IN ('sent','failed','pending'));
ALTER TABLE inquiry_notification_attempts DROP CONSTRAINT inquiry_notification_attempts_result_check;
ALTER TABLE inquiry_notification_attempts ADD CONSTRAINT inquiry_notification_attempts_result_check CHECK (result IN ('sent','failed','pending'));
