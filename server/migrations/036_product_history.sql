CREATE TABLE product_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 previous_data JSONB,
 new_data JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX product_history_product ON product_history(product_id,id DESC);
CREATE FUNCTION product_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'product history is append only'; END; $$;
CREATE TRIGGER product_history_no_update_delete BEFORE UPDATE OR DELETE ON product_history FOR EACH ROW EXECUTE FUNCTION product_history_no_change();
