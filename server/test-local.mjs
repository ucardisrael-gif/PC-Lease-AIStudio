import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

const dir = mkdtempSync(join(tmpdir(), 'pc-lease-pg-test-'));
const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const password = randomBytes(24).toString('hex');
const db = new EmbeddedPostgres({ databaseDir: join(dir, 'db'), port, user: 'pclease_test', password, authMethod: 'scram-sha-256', initdbFlags: ['--encoding=UTF8'], persistent: true, postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: () => {} });
let failed = false;
try {
  await db.initialise(); await db.start();
  const tests = ['server/tests/lease-selection.test.mjs', 'server/tests/lease-plans.test.mjs', 'server/tests/commission-period-integration.test.mjs', 'server/tests/commission-math.test.mjs', 'server/tests/dealer-portal.test.mjs', 'server/tests/access-roles.test.mjs', 'server/tests/rate-limit-cleanup.test.mjs', 'server/tests/database.test.mjs', 'server/tests/reservation-history-performance.test.mjs', 'server/tests/service-pagination-performance.test.mjs', 'server/tests/catalog.test.mjs', 'server/tests/admin-products.test.mjs', 'server/tests/requests.test.mjs', 'server/tests/pricing.test.mjs', 'server/tests/quote-calculation.test.mjs', 'server/tests/quote-preview.test.mjs', 'server/tests/multi-quote.test.mjs', 'server/tests/quote-pdf.test.mjs', 'server/tests/contract-pdf.test.mjs', 'server/tests/auth.test.mjs', 'server/tests/server.test.mjs', 'server/tests/mail.test.mjs'];
  // The restore test uses the bundled Windows PostgreSQL tools and its own disposable cluster.
  if (process.platform === 'win32') tests.push('server/tests/offline-backup.test.mjs');
  const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...tests], { stdio: 'inherit', env: { ...process.env, PC_LEASE_TEST_DATABASE_URL: `postgresql://pclease_test:${password}@127.0.0.1:${port}/postgres` } });
  const [code] = await once(child, 'exit');
  failed = code !== 0;
} finally { await db.stop(); rmSync(dir, { recursive: true, force: true }); }
if (failed) process.exit(1);
