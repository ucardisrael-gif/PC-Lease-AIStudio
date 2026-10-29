import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { createMailer } from '../mail.mjs';
import { sendOffer } from '../offer.mjs';
import { sendContactMessage } from '../contact.mjs';

test('mailer requires configuration and validates messages', async () => {
  assert.throws(() => createMailer(), /not configured/);
  const mailer = createMailer({ user: 'sender@example.invalid', password: 'test', transport: nodemailer.createTransport({ streamTransport: true, buffer: true }) });
  await assert.rejects(mailer.send({ to: '', subject: 'test', text: 'test' }), /required/);
  mailer.close();
});

test('estimate email attaches the PDF and only reports success when accepted', async () => {
  let message;
  const pdf = Buffer.from('%PDF-test');
  const mailer = { send: async m => { message = m; return { accepted: [m.to], rejected: [] }; } };
  await sendOffer(mailer, 'customer@example.invalid', pdf, 'en');
  assert.equal(message.to, 'customer@example.invalid');
  assert.deepEqual(message.attachments[0].content, pdf);
  await assert.rejects(sendOffer(mailer, 'bad\r\n@example.invalid', pdf, 'en'), /invalid_email/);
  await assert.rejects(sendOffer(null, 'customer@example.invalid', pdf, 'en'), /mail_unavailable/);
  await assert.rejects(sendOffer({ send: async () => ({ accepted: [], rejected: ['customer@example.invalid'] }) }, 'customer@example.invalid', pdf, 'en'), /mail_unavailable/);
  await assert.rejects(sendOffer({ send: async () => {throw Error('connection lost');} }, 'customer@example.invalid', pdf, 'en'), /mail_uncertain/);
  await assert.rejects(sendOffer({ send: async () => ({ accepted: [], rejected: [] }) }, 'customer@example.invalid', pdf, 'en'), /mail_uncertain/);
});

test('contact messages use the configured destination, visitor reply address, and report delivery failures', async () => {
  const db = { query: async () => ({ rowCount: 1, rows: [{ content: { visible:true, recipientEmail:'project@example.invalid' }, version:1 }] }) };
  let sent;
  const mailer = { send: async m => { sent = m; return { accepted:[m.to], rejected:[] }; } };
  const body = { name:'Test', email:'visitor@example.invalid', phone:'123', message:'Test message', company:'Example company', desired_quantity:7 };
  await sendContactMessage(db, mailer, body);
  assert.equal(sent.to,'project@example.invalid'); assert.equal(sent.replyTo,body.email); assert.match(sent.text,/Test message/);assert.match(sent.text,/Example company/);assert.match(sent.text,/Количество устройств: 7/);
  await assert.rejects(sendContactMessage(db, null, body), /contact_unavailable/);
  await assert.rejects(sendContactMessage(db, mailer, { ...body, email:'bad\r\n@example.invalid' }), /invalid_contact/);
  await assert.rejects(sendContactMessage(db, { send: async () => ({ accepted:[], rejected:['project@example.invalid'] }) }, body), /contact_unavailable/);
});

test('mail is passed to the transport and delivery errors are propagated', async () => {
  let captured;
  const transport = { sendMail: async (message) => { captured = message; return { accepted: [message.to], rejected: [] }; }, verify: async () => true, close: () => {} };
  const mailer = createMailer({ user: 'sender@example.invalid', password: 'test', transport });
  assert.equal(await mailer.verify(), true);
  assert.deepEqual(await mailer.send({ to: 'recipient@example.invalid', subject: 'Example', text: 'Example message' }), { accepted: ['recipient@example.invalid'], rejected: [] });
  assert.equal(captured.from, 'sender@example.invalid');
  const failing = createMailer({ user: 'sender@example.invalid', password: 'test', transport: { ...transport, sendMail: async () => { throw new Error('delivery failed'); } } });
  await assert.rejects(failing.send({ to: 'recipient@example.invalid', subject: 'Example', text: 'Example' }), /delivery failed/);
});
