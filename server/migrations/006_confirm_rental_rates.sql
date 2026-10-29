-- Owner confirmed 199 for 30 days. Preserve existing daily rates and every
-- historical request; initialise missing rates for the seven existing models.
UPDATE products
SET details_json = jsonb_set(details_json, '{rentalRates}',
      COALESCE(details_json->'rentalRates', '{"dailyShort":35,"dailyWeek":18}'::jsonb)
      || '{"monthly":199}'::jsonb),
    edit_version = edit_version + 1
WHERE id IN ('prod-dell-5420','prod-dell-7410','prod-dell-7420','prod-hp-840g4','prod-lenovo-x1g6','prod-dell-optiplex-micro','prod-lenovo-m720q')
  AND (details_json->'rentalRates'->>'monthly') IS DISTINCT FROM '199';
