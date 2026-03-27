const { shell } = require('electron');
const path = require('path');
const db = require('./db');

async function send(docType, docId, opts) {
  const isInvoice = docType === 'invoice';
  const doc = isInvoice ? db.getInvoice(docId) : db.getEstimate(docId);
  if (!doc) throw new Error(`${docType} not found`);

  const client = db.getClient(doc.client_id);
  if (!client) throw new Error('Client not found');

  const settings = db.getSettings();
  const clientName = client.is_company ? client.company : `${client.first_name} ${client.last_name}`;
  const docNumber = isInvoice ? doc.invoice_number : doc.estimate_number;

  // Generate PDF first
  const pdf = require('./pdf');
  const { path: pdfPath, filename: pdfFilename } = await pdf.generate(docType, docId);

  // Resolve placeholders in subject and body
  const total = (doc.total || 0).toFixed(2);
  const placeholders = {
    '{client_name}': clientName,
    '{document_number}': docNumber,
    '{total}': total,
    '{business_name}': settings.business_name || 'Krull D+A',
  };

  function resolvePlaceholders(text) {
    let result = text || '';
    for (const [key, value] of Object.entries(placeholders)) {
      result = result.split(key).join(value);
    }
    return result;
  }

  const defaultSubject = isInvoice
    ? (settings.email_invoice_subject || 'Invoice {document_number} from {business_name}')
    : (settings.email_estimate_subject || 'Estimate {document_number} from {business_name}');
  const defaultBody = isInvoice
    ? (settings.email_invoice_body || 'Please find attached invoice {document_number} for {total}.\n\nKind regards,\n{business_name}')
    : (settings.email_estimate_body || 'Please find attached estimate {document_number} for {total}.\n\nKind regards,\n{business_name}');

  const to = opts?.to || client.email || '';
  const cc = opts?.cc || '';
  const subject = resolvePlaceholders(opts?.subject || defaultSubject);
  const body = resolvePlaceholders(opts?.body || defaultBody);

  // Check if SMTP is configured
  const smtpHost = settings.smtp_host;
  if (smtpHost) {
    // Send via SMTP
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(settings.smtp_port) || 587,
      secure: parseInt(settings.smtp_port) === 465,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    const fromName = settings.smtp_from_name || settings.business_name || 'Krull D+A';
    const fromEmail = settings.smtp_from_email || settings.email || settings.smtp_user;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      cc: cc || undefined,
      subject,
      text: body,
      attachments: [{
        filename: pdfFilename,
        path: pdfPath,
      }],
    });
  } else {
    // Fallback: open default mail client on Mac via mailto
    // On Mac, open the PDF so user can drag it into Mail
    if (process.platform === 'darwin') {
      shell.openPath(pdfPath);
      // Also open a mailto link
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      shell.openExternal(mailto);
    } else {
      // On Windows, open the PDF
      shell.openPath(pdfPath);
    }
  }

  // Update sent_at on document
  if (isInvoice) {
    db.updateInvoiceStatus(docId, 'sent');
  } else {
    db.updateEstimateStatus(docId, 'sent');
  }

  return { ok: true, pdfPath };
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
