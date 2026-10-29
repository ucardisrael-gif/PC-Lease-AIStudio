ALTER TABLE contract_documents ADD COLUMN document_kind TEXT NOT NULL DEFAULT 'unspecified' CHECK (document_kind IN ('unspecified','signed_copy','supporting'));
