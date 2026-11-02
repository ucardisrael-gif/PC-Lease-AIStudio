import { readFile } from 'node:fs/promises';
import pg from 'pg';

export async function openDatabase(connectionString) {
  if (!connectionString) throw new Error('Set PC_LEASE_DATABASE_URL before starting the server');
  const pool = new pg.Pool({ connectionString, max: 5 });
  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [68499001]);
      await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
      for (const [version, file] of [[1, '001_initial.sql'], [2, '002_request_delivery.sql'], [3, '003_auth.sql'], [4, '004_product_version.sql'], [5, '005_site_blocks.sql'], [6, '006_confirm_rental_rates.sql'], [7, '007_user_display_name.sql'], [8, '008_request_status_history.sql'], [9, '009_user_profiles.sql'], [10, '010_organizations.sql'], [11, '011_request_organization.sql'], [12, '012_user_organization.sql'], [13, '013_staff_permissions.sql'], [14, '014_inventory.sql'], [15, '015_asset_reservations.sql'], [16, '016_asset_handover.sql'], [17, '017_asset_purchase.sql'], [18, '018_service_tickets.sql'], [19, '019_service_replacements.sql'], [20, '020_contract_drafts.sql'], [21, '021_financial_entries.sql'], [22, '022_product_media.sql'], [23, '023_user_role_history.sql'], [24, '024_user_activation.sql'], [25, '025_request_customer.sql'], [26, '026_email_verification.sql'], [27, '027_request_internal_notes.sql'], [28, '028_contract_history_integrity.sql'], [29, '029_contact_inquiries.sql'], [30, '030_inquiry_notes.sql'], [31, '031_inquiry_notification_attempts.sql'], [32, '032_request_notification_attempts.sql'], [33, '033_order_notification_settings.sql'], [34, '034_organization_history.sql'], [35, '035_organization_history_integrity.sql'], [36, '036_product_history.sql'], [37, '037_inventory_service_history_integrity.sql'], [38, '038_purchase_history_integrity.sql'], [39, '039_request_inquiry_history_integrity.sql'], [40, '040_request_link_history_integrity.sql'], [41, '041_user_access_history_integrity.sql'], [42, '042_notification_history_integrity.sql'], [43, '043_dealers.sql'], [44, '044_request_dealer.sql'], [45, '045_contract_reviews.sql'], [46, '046_tax_settings.sql'], [47, '047_order_numbers.sql'], [48, '048_contract_documents.sql'], [49, '049_financial_occurred_on.sql'], [50, '050_inquiry_notification_resolution.sql'], [51, '051_request_notification_resolution.sql'], [52, '052_contact_company_quantity.sql'], [53, '053_contact_context.sql'], [54, '054_site_block_history.sql'], [55, '055_reservation_operations.sql'], [56, '056_replacement_operations.sql'], [57, '057_contract_update_operations.sql'], [58, '058_contract_document_kind.sql'], [59, '059_contract_document_kind_history.sql'], [60, '060_service_update_operations.sql'], [61, '061_reservation_serial_snapshots.sql'], [62, '062_replacement_serial_snapshot.sql'], [63, '063_replacement_history_index.sql'], [64, '064_finance_date_corrections.sql'], [65, '065_reservation_history_index.sql'], [66, '066_finance_amount_corrections.sql'], [67, '067_service_ticket_order_index.sql'], [68, '068_notification_retry_started.sql'], [69, '069_request_snapshot_integrity.sql'], [70, '070_financial_reversal_integrity.sql'], [71, '071_equipment_history_integrity.sql'], [72, '072_service_ticket_identity.sql'], [73, '073_access_roles.sql'], [74, '074_dealer_portal.sql'], [75, '075_dealer_clients.sql'], [76, '076_dealer_commission_rates.sql'], [77, '077_dealer_commission_terms.sql'], [78, '078_dealer_commission_manual_entries.sql'], [79, '079_commission_snapshots.sql'], [80, '080_commission_refunds.sql'], [81, '081_commission_payment_supersessions.sql'], [82, '082_commission_terms_by_dealer.sql'], [83, '083_commission_rate_operations.sql'], [84, '084_commission_rate_overrides.sql'], [85, '085_commission_payment_ownership.sql'], [86, '086_lease_plans.sql'], [87, '087_plan_product_unique.sql'], [88, '088_addon_image.sql']]) {
        const existing = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [version]);
        if (!existing.rowCount) {
          await client.query(await readFile(new URL('./migrations/' + file, import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        }
      }
      if ((process.env.PC_LEASE_CRM_WORK_TEST === '1' || process.env.PC_LEASE_CRM_WORK_ENABLED === '1')) {
        const target = new URL(connectionString);
        if (process.env.PC_LEASE_CRM_WORK_TEST === '1' && (target.hostname !== '127.0.0.1' || target.username !== 'pclease_test' || target.pathname !== '/postgres')) throw new Error('CRM test mode requires the isolated test database');
        const present = await client.query('SELECT 1 FROM schema_migrations WHERE version = 89');
        if (!present.rowCount) {
          await client.query(await readFile(new URL('./migrations/089_crm_work_boards.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (89)');
        }
        const printPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 90');
        if (!printPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/090_crm_print_templates.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (90)');
        }
        const automationPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 91');
        if (!automationPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/091_crm_column_automation.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (91)');
        }
        const layoutPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 92');
        if (!layoutPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/092_crm_print_layout.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (92)');
        }
        const optionsPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 94');
        if (!optionsPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/094_crm_print_options.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (94)');
        }
        const shiftsPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 95');
        if (!shiftsPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/095_crm_staff_schedule.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (95)');
        }
        const printDetailsPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 96');
        if (!printDetailsPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/096_crm_print_details.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (96)');
        }
        const deletionPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 97');
        if (!deletionPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/097_crm_permanent_deletion.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (97)');
        }
        const boardVisibilityPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 98');
        if (!boardVisibilityPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/098_crm_board_visibility.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (98)');
        }
        const boardActionsPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 99');
        if (!boardActionsPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/099_crm_board_actions.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (99)');
        }
        const cardPermissionsPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 100');
        if (!cardPermissionsPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/100_crm_granular_card_permissions.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (100)');
        }
        const structurePermissionsPresent = await client.query('SELECT 1 FROM schema_migrations WHERE version = 101');
        if (!structurePermissionsPresent.rowCount) {
          await client.query(await readFile(new URL('./migrations/101_crm_structure_permissions.sql', import.meta.url), 'utf8'));
          await client.query('INSERT INTO schema_migrations(version) VALUES (101)');
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
    return pool;
  } catch (error) {
    await pool.end().catch(() => {});
    throw error;
  }
}
