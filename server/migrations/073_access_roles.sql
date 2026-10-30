CREATE TABLE access_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  permissions TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (permissions <@ ARRAY['orders','catalog','content','inventory','inventory_cost','service','contracts','finance']::text[])
);
CREATE UNIQUE INDEX access_roles_name_unique ON access_roles (lower(name));
CREATE TABLE access_role_assignments (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role_id TEXT NOT NULL REFERENCES access_roles(id) ON DELETE RESTRICT,
  PRIMARY KEY(user_id, role_id)
);
ALTER TABLE users ADD COLUMN access_roles_version INTEGER NOT NULL DEFAULT 1 CHECK(access_roles_version > 0);
CREATE TABLE access_role_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  role_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO access_roles(id,name,permissions) VALUES
 ('sales','Sales',ARRAY['orders']),
 ('catalog','Catalog & content',ARRAY['catalog','content']),
 ('warehouse','Warehouse',ARRAY['inventory']),
 ('service','Service',ARRAY['service']),
 ('contracts','Contracts',ARRAY['contracts']),
 ('finance','Finance',ARRAY['finance']);
