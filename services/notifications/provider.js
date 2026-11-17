// Outbound notification provider (email/push). Default just logs; replace with a real provider
// via setProvider({ send: async ({ to, subject, body }) => {} }).
let transport;
let provider = {
  send: async ({ to, subject, body }) => {
    if (!process.env.SMTP_HOST) {
      // In-app reminders work without SMTP; configure SMTP for outbound email.
      console.log(`[notify:in-app-only] to=${to} subject="${subject}"`);
      return;
    }
    if (!transport) {
      transport = require('nodemailer').createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === '1',
        auth: process.env.SMTP_USER ? { user:process.env.SMTP_USER, pass:process.env.SMTP_PASSWORD } : undefined,
        connectionTimeout:10000,
      });
    }
    await transport.sendMail({ from:process.env.SMTP_FROM || 'Task Manager <reminders@taskmanager.test>', to, subject, text:body });
  },
};

const setProvider = (p) => { provider = p; };
const send = (msg) => provider.send(msg);

module.exports = { setProvider, send };
