ALTER TABLE contact_inquiries ADD COLUMN company TEXT NOT NULL DEFAULT '';
ALTER TABLE contact_inquiries ADD COLUMN desired_quantity INTEGER CHECK (desired_quantity BETWEEN 1 AND 100000);
