// Email sending via Nodemailer — implemented in Session 6

async function send(docType, docId, opts) {
  // Stub: will send email with PDF attachment via SMTP
  throw new Error('Email sending not yet implemented (Session 6)');
}

async function testConnection(smtpConfig) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpConfig.smtp_host,
    port: parseInt(smtpConfig.smtp_port) || 587,
    secure: parseInt(smtpConfig.smtp_port) === 465,
    auth: {
      user: smtpConfig.smtp_user,
      pass: smtpConfig.smtp_pass,
    },
  });
  await transporter.verify();
  return { ok: true };
}

module.exports = { send, testConnection };
