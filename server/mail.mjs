import nodemailer from 'nodemailer';

export function createMailer({ user, password, transport } = {}) {
  if (!user || !password) throw new Error('Project email is not configured');
  const mailTransport = transport ?? nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user, pass: password },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  return {
    verify: () => mailTransport.verify(),
    async send({ to, subject, text, html, attachments, replyTo }) {
      if (!to || !subject || (!text && !html)) throw new Error('Recipient, subject and message are required');
      const result = await mailTransport.sendMail({ from: user, to, subject, text, html, attachments, replyTo });
      return { accepted: result.accepted ?? [], rejected: result.rejected ?? [] };
    },
    close: () => mailTransport.close(),
  };
}
