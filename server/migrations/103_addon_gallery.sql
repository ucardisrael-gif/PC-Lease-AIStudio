ALTER TABLE lease_addons ADD COLUMN gallery TEXT[] NOT NULL DEFAULT '{}';
UPDATE lease_addons SET gallery = ARRAY[image_path] WHERE image_path <> '';
