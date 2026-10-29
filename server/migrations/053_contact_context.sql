ALTER TABLE contact_inquiries ADD COLUMN source TEXT CHECK (source IN ('contact','product'));
ALTER TABLE contact_inquiries ADD COLUMN product_slug TEXT;
ALTER TABLE contact_inquiries ADD COLUMN product_model TEXT;
ALTER TABLE contact_inquiries ADD COLUMN product_sku TEXT;
