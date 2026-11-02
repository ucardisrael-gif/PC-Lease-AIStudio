-- Test-only workforce data; independent from orders and existing staff records.
CREATE TABLE crm_workforce_settings (id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id), enabled BOOLEAN NOT NULL DEFAULT false, version INTEGER NOT NULL DEFAULT 1 CHECK(version>0));
INSERT INTO crm_workforce_settings(id) VALUES(true);
CREATE TABLE crm_workforce_shifts (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), shift_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
 role_label TEXT NOT NULL DEFAULT '' CHECK(length(role_label)<=120), location TEXT NOT NULL DEFAULT '' CHECK(length(location)<=200), notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=2000),
 created_by TEXT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), canceled_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), CHECK(end_time>start_time)
);
CREATE TABLE crm_workforce_entries (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), clock_in TIMESTAMPTZ NOT NULL DEFAULT now(), clock_out TIMESTAMPTZ, notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=2000), version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), CHECK(clock_out IS NULL OR clock_out>=clock_in)
);
CREATE UNIQUE INDEX crm_workforce_one_open_entry ON crm_workforce_entries(user_id) WHERE clock_out IS NULL;
CREATE INDEX crm_workforce_shifts_date_idx ON crm_workforce_shifts(shift_date,user_id);
CREATE INDEX crm_workforce_entries_user_idx ON crm_workforce_entries(user_id,clock_in DESC);
CREATE TABLE crm_workforce_events (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), subject_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TRIGGER crm_workforce_events_no_change BEFORE UPDATE OR DELETE ON crm_workforce_events FOR EACH ROW EXECUTE FUNCTION crm_work_events_immutable();
