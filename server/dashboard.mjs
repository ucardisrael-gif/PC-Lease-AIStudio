export async function getDashboard(db){
 const result=await db.query(`SELECT
  (SELECT count(*)::integer FROM requests WHERE status='new') AS new_requests,
  (SELECT count(*)::integer FROM requests WHERE status='reviewed') AS reviewed_requests,
  (SELECT count(*)::integer FROM requests WHERE notification_status='failed') AS failed_order_notifications,
  (SELECT count(*)::integer FROM contact_inquiries WHERE status='new') AS new_inquiries,
  (SELECT count(*)::integer FROM contact_inquiries WHERE notification_status='failed') AS failed_inquiry_notifications,
  (SELECT count(*)::integer FROM inventory_assets WHERE status='available') AS available_assets,
  (SELECT count(*)::integer FROM inventory_assets WHERE status='reserved') AS reserved_assets,
  (SELECT count(*)::integer FROM inventory_assets WHERE status IN ('issued','service_issued')) AS issued_assets,
  (SELECT count(*)::integer FROM inventory_assets WHERE status IN ('received','qa','repair')) AS inspection_assets,
  (SELECT count(*)::integer FROM service_tickets WHERE status IN ('open','in_progress')) AS active_tickets,
  (SELECT count(*)::integer FROM service_replacements WHERE returned_at IS NULL) AS active_replacements,
  (SELECT count(*)::integer FROM financial_entries f WHERE f.kind IN ('payment','refund') AND f.occurred_on IS NULL AND NOT EXISTS(SELECT 1 FROM financial_entries reversal WHERE reversal.reverses_id=f.id)) AS undated_financial_entries,
  (SELECT count(*)::integer FROM contract_drafts WHERE status='draft') AS contract_drafts,
  (SELECT count(*)::integer FROM users WHERE active=true) AS active_users,
  (SELECT count(*)::integer FROM users WHERE active=true AND email_verified_at IS NULL) AS unverified_users,
  (SELECT count(*)::integer FROM products WHERE published=true) AS published_products`);return result.rows[0];
}
