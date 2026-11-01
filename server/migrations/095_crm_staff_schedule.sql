-- Applied only when CRM is explicitly enabled or in isolated test mode: planned shifts, without time clock or attendance.
CREATE TABLE crm_staff_shifts (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 shift_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
 role_label TEXT NOT NULL DEFAULT '' CHECK(length(role_label)<=120), location TEXT NOT NULL DEFAULT '' CHECK(length(location)<=200), notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=2000),
 created_by TEXT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), canceled_at TIMESTAMPTZ,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), CHECK(end_time>start_time)
);
CREATE INDEX crm_staff_shifts_date_idx ON crm_staff_shifts(shift_date,user_id);
CREATE TABLE crm_staff_shift_events (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), shift_id TEXT NOT NULL REFERENCES crm_staff_shifts(id), action TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TRIGGER crm_staff_shift_events_no_change BEFORE UPDATE OR DELETE ON crm_staff_shift_events FOR EACH ROW EXECUTE FUNCTION crm_work_events_immutable();
