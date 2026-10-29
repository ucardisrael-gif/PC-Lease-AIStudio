CREATE TABLE contract_document_kind_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 document_id TEXT NOT NULL REFERENCES contract_documents(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 old_kind TEXT NOT NULL CHECK(old_kind IN ('unspecified','signed_copy','supporting')),
 new_kind TEXT NOT NULL CHECK(new_kind IN ('unspecified','signed_copy','supporting')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contract_document_kind_history_document ON contract_document_kind_history(document_id,id DESC);
CREATE TRIGGER contract_document_kind_history_immutable BEFORE UPDATE OR DELETE ON contract_document_kind_history FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
