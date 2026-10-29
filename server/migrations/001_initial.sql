CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower ON users (lower(email));
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('laptop', 'desktop')),
  details_json JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE tariffs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  mode TEXT NOT NULL CHECK (mode IN ('purchase', 'lease', 'short_rental')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  period_days INTEGER CHECK (period_days IS NULL OR period_days > 0),
  min_days INTEGER CHECK (min_days IS NULL OR min_days > 0),
  max_days INTEGER CHECK (max_days IS NULL OR (min_days IS NOT NULL AND max_days >= min_days)),
  term_months INTEGER CHECK (term_months IS NULL OR term_months > 0),
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tariffs_product_id ON tariffs(product_id);
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
  customer_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  product_snapshot_json JSONB NOT NULL,
  tariff_snapshot_json JSONB NOT NULL,
  contact_json JSONB NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
