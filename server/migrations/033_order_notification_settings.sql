CREATE TABLE order_notification_settings (
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),
 recipient_email TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO order_notification_settings(id,recipient_email) VALUES(true,'alfagpt4@gmail.com');
CREATE TABLE order_notification_settings_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 previous_email TEXT NOT NULL,
 new_email TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
