-- Multiple changes on the same day are ordered and retain their audit history.
ALTER TABLE dealer_commission_rates DROP CONSTRAINT dealer_commission_rates_dealer_id_effective_on_key;
ALTER TABLE dealer_commission_rates ADD COLUMN operation_id TEXT UNIQUE;
