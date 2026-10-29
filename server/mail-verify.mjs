import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createMailer } from './mail.mjs';

const localConfig = new URL('../.env.mail', import.meta.url);
if (existsSync(localConfig)) loadEnvFile(localConfig);
const mailer = createMailer({ user: process.env.PC_LEASE_MAIL_USER, password: process.env.PC_LEASE_MAIL_APP_PASSWORD });
try {
  await mailer.verify();
  console.log('Gmail connection verified. No email was sent.');
} catch {
  console.error('Gmail verification failed. Check account, app password and network access.');
  process.exitCode = 1;
} finally { mailer.close(); }
