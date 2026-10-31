-- An order can change dealer without moving the first dealer's accrued amounts.
ALTER TABLE dealer_commission_terms DROP CONSTRAINT dealer_commission_terms_pkey;
ALTER TABLE dealer_commission_terms ADD PRIMARY KEY(request_id,dealer_id);
