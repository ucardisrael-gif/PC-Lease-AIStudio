-- An uploaded file is evidence supplied by staff, not an electronic signature.
CREATE TABLE contract_documents (
 id TEXT PRIMARY KEY,
 contract_id TEXT NOT NULL REFERENCES contract_drafts(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK (version > 0),
 file_name TEXT NOT NULL,
 sha256 TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
 contents BYTEA NOT NULL CHECK (octet_length(contents) BETWEEN 8 AND 5242880),
 uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (contract_id,version,sha256)
);
CREATE FUNCTION contract_document_no_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'contract documents are append only'; END; $$;
CREATE TRIGGER contract_document_immutable BEFORE UPDATE OR DELETE ON contract_documents FOR EACH ROW EXECUTE FUNCTION contract_document_no_change();
