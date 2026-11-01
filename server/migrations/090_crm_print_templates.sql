-- Applied only when CRM is explicitly enabled or in isolated test mode.
CREATE TABLE crm_work_print_templates (
 id TEXT PRIMARY KEY,
 board_id TEXT NOT NULL REFERENCES crm_work_boards(id) ON DELETE RESTRICT,
 name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
 field_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(field_ids)='array' AND pg_column_size(field_ids)<=16000),
 include_description BOOLEAN NOT NULL DEFAULT true,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX crm_work_print_templates_board_idx ON crm_work_print_templates(board_id,id);
