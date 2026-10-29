ALTER TABLE requests ADD COLUMN request_hash TEXT;
ALTER TABLE requests ADD COLUMN notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed'));
