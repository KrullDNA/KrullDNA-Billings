const { shell } = require('electron');
const { exec } = require('child_process');
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
  const { path: pdfPath } = await pdf.generate(docType, docId);

  // Resolve placeholders
  const total = (doc.total || 0).toFixed(2);
  const placeholders = {
    '{client_name}': clientName,
    '{document_number}': docNumber,
    '{total}': total,
    '{business_name}': settings.business_name || 'Krull D+A',
  };

  function resolve(text) {
    let r = text || '';
    for (const [k, v] of Object.entries(placeholders)) r = r.split(k).join(v);
    return r;
  }

  const defaultSubject = isInvoice
    ? (settings.email_invoice_subject || 'Invoice {document_number} from {business_name}')
    : (settings.email_estimate_subject || 'Estimate {document_number} from {business_name}');
  const defaultBody = isInvoice
    ? (settings.email_invoice_body || 'Please find attached invoice {document_number} for ${total}.\n\nKind regards,\n{business_name}')
    : (settings.email_estimate_body || 'Please find attached estimate {document_number} for ${total}.\n\nKind regards,\n{business_name}');

  const to = opts?.to || client.email || '';
  const subject = resolve(opts?.subject || defaultSubject);
  const body = resolve(opts?.body || defaultBody);

  // Open Mac Mail with PDF attachment via AppleScript
  if (process.platform === 'darwin') {
    const escapedSubject = subject.replace(/"/g, '\\"');
    const escapedBody = body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const escapedPath = pdfPath.replace(/"/g, '\\"');
    const escapedTo = to.replace(/"/g, '\\"');

    const script = `
      tell application "Mail"
        set newMessage to make new outgoing message with properties {subject:"${escapedSubject}", content:"${escapedBody}", visible:true}
        tell newMessage
          ${escapedTo ? `make new to recipient at end of to recipients with properties {address:"${escapedTo}"}` : ''}
          make new attachment with properties {file name:POSIX file "${escapedPath}"}
        end tell
        activate
      end tell
    `;

    await new Promise((resolve, reject) => {
      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  } else {
    // Windows/Linux fallback: open PDF and let user attach manually
    shell.openPath(pdfPath);
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
