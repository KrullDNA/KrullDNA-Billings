const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');
const db = require('./db');

const CURRENCY_SYMBOLS = { AUD: '$', USD: '$', EUR: '\u20ac', GBP: '\u00a3', NZD: '$', CAD: '$', SGD: '$' };

function fmt(amount, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  const n = (amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sym}${n}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function generate(docType, docId) {
  const isInvoice = docType === 'invoice';
  const doc = isInvoice ? db.getInvoice(docId) : db.getEstimate(docId);
  if (!doc) throw new Error(`${docType} not found: ${docId}`);

  const client = db.getClient(doc.client_id);
  if (!client) throw new Error('Client not found');

  const settings = db.getSettings();
  const lineItems = doc.lineItems || [];
  const currency = doc.currency || 'AUD';

  // Get layout blocks — from document snapshot, or from template, or default
  let blocks = [];
  if (doc.layout_snapshot) {
    blocks = JSON.parse(doc.layout_snapshot);
  } else if (doc.template_id) {
    const template = db.getTemplate(doc.template_id);
    if (template) blocks = JSON.parse(template.blocks_json || '[]');
  }
  if (blocks.length === 0) {
    const templates = db.getTemplates(docType);
    const def = templates.find((t) => t.is_default) || templates[0];
    if (def) blocks = JSON.parse(def.blocks_json || '[]');
  }

  const isPaid = isInvoice && doc.status === 'paid';

  const data = { settings, client, document: doc, lineItems, docType, currency, isPaid };

  const html = renderToHtml(blocks, data);

  // Generate PDF via Puppeteer
  let puppeteer;
  try {
    puppeteer = require('puppeteer-core');
  } catch {
    puppeteer = require('puppeteer');
  }

  // Try to find a Chrome/Chromium executable
  const chromePath = findChrome();

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const clientName = (client.is_company ? client.company : `${client.first_name}${client.last_name}`).replace(/[^a-zA-Z0-9]/g, '');
  const docNumber = (isInvoice ? doc.invoice_number : doc.estimate_number).replace(/[^a-zA-Z0-9-]/g, '');
  const filename = `${clientName}_${docNumber}.pdf`;

  const tmpDir = path.join(os.tmpdir(), 'krull-billings-pdfs');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const pdfPath = path.join(tmpDir, filename);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
  });

  await browser.close();
  return { path: pdfPath, filename };
}

function findChrome() {
  const paths = process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    : process.platform === 'win32'
      ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
      : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── HTML Renderer ──

function renderToHtml(blocks, data) {
  const { settings, isPaid } = data;
  const brandColour = settings.brand_colour || '#4263eb';

  let bodyHtml = '';
  for (const block of blocks) {
    bodyHtml += renderBlockToHtml(block, data);
  }

  // PAID IN FULL stamp overlay
  const paidStamp = isPaid ? `
    <div style="position:fixed;top:120px;right:60px;width:160px;height:160px;transform:rotate(-18deg);pointer-events:none;z-index:100;">
      <div style="width:150px;height:150px;border:5px solid #dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <span style="color:#dc2626;font-weight:bold;font-size:20px;text-align:center;line-height:1.2;">PAID<br>IN FULL</span>
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 12px; color: #111827; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; }
  .brand-bg { background-color: ${brandColour}; }
  .brand-text { color: ${brandColour}; }
</style>
</head>
<body>
${paidStamp}
${bodyHtml}
</body>
</html>`;
}

function renderBlockToHtml(block, data) {
  const { type, props } = block;
  const pt = props.paddingTop || 0;
  const pb = props.paddingBottom || 0;
  const wrap = (inner) => `<div style="padding-top:${pt}px;padding-bottom:${pb}px;">${inner}</div>`;

  switch (type) {
    case 'header_block': return wrap(headerHtml(props, data));
    case 'client_block': return wrap(clientHtml(props, data));
    case 'doc_title_block': return wrap(docTitleHtml(props, data));
    case 'line_items_block': return wrap(lineItemsHtml(props, data));
    case 'totals_block': return wrap(totalsHtml(props, data));
    case 'notes_block': return wrap(notesHtml(props, data));
    case 'divider_block': return wrap(dividerHtml(props));
    case 'spacer_block': return `<div style="height:${props.height || 24}px;"></div>`;
    case 'text_block': return wrap(textHtml(props));
    default: return '';
  }
}

function headerHtml(props, data) {
  const s = data.settings || {};
  let logoHtml = '';
  if (props.showLogo) {
    // Try to embed logo as base64
    const logoPath = s.logo_path;
    if (logoPath && fs.existsSync(logoPath)) {
      const ext = path.extname(logoPath).slice(1).toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
      const b64 = fs.readFileSync(logoPath).toString('base64');
      logoHtml = `<img src="data:${mime};base64,${b64}" style="width:60px;height:60px;object-fit:contain;border-radius:4px;" />`;
    } else {
      logoHtml = `<div style="width:60px;height:60px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#9ca3af;">Logo</div>`;
    }
  }

  const dir = props.logoAlign === 'right' ? 'row-reverse' : 'row';
  let info = '';
  if (props.showBusinessName) info += `<div style="font-size:18px;font-weight:bold;">${esc(s.business_name || 'Krull D+A')}</div>`;
  if (props.showAbn && s.abn) info += `<div style="font-size:9px;opacity:0.7;">ABN: ${esc(s.abn)}</div>`;
  if (props.showContact) {
    let contact = '';
    if (s.email) contact += `<div>${esc(s.email)}</div>`;
    if (s.phone) contact += `<div>${esc(s.phone)}</div>`;
    if (s.address_street) contact += `<div>${esc(s.address_street)}</div>`;
    const cityLine = [s.address_city, s.address_state, s.address_postcode].filter(Boolean).join(', ');
    if (cityLine) contact += `<div>${esc(cityLine)}</div>`;
    if (contact) info += `<div style="font-size:9px;opacity:0.7;margin-top:4px;">${contact}</div>`;
  }

  return `<div style="display:flex;flex-direction:${dir};align-items:flex-start;gap:16px;background:${props.bgColor || '#fff'};color:${props.textColor || '#111827'};">${logoHtml}<div>${info}</div></div>`;
}

function clientHtml(props, data) {
  const c = data.client || {};
  const contactName = [c.first_name, c.last_name].filter(Boolean).join(' ');
  const fs2 = props.fontSize || 12;
  let html = `<div style="font-size:9px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">${esc(props.sectionLabel || 'BILL TO')}</div>`;
  if (c.company) html += `<div style="font-size:${fs2}px;font-weight:500;">${esc(c.company)}</div>`;
  if (contactName) html += `<div style="font-size:${c.company ? fs2 - 1 : fs2}px;${c.company ? 'color:#4b5563;' : 'font-weight:500;'}">${esc(contactName)}</div>`;
  if (c.address_street) html += `<div style="font-size:${fs2 - 1}px;color:#4b5563;">${esc(c.address_street)}</div>`;
  const cityLine = [c.address_city, c.address_state, c.address_postcode].filter(Boolean).join(', ');
  if (cityLine) html += `<div style="font-size:${fs2 - 1}px;color:#4b5563;">${esc(cityLine)}</div>`;
  if (props.showEmail && c.email) html += `<div style="font-size:${fs2 - 1}px;color:#4b5563;">${esc(c.email)}</div>`;
  if (props.showPhone && c.phone) html += `<div style="font-size:${fs2 - 1}px;color:#4b5563;">${esc(c.phone)}</div>`;
  return html;
}

function docTitleHtml(props, data) {
  const doc = data.document || {};
  const isInvoice = data.docType === 'invoice';
  const title = props.titleLabel || (isInvoice ? 'TAX INVOICE' : 'ESTIMATE');

  let right = '';
  if (props.showNumber) right += `<div style="font-size:14px;font-weight:600;color:#111827;">${esc(isInvoice ? doc.invoice_number : doc.estimate_number) || '#0000'}</div>`;
  if (props.showDate) right += `<div>Date: ${fmtDate(isInvoice ? doc.invoice_date : doc.estimate_date)}</div>`;
  if (props.showDueDate && isInvoice && doc.due_date) right += `<div>Due: ${fmtDate(doc.due_date)}</div>`;
  if (props.showDueDate && isInvoice && doc.terms) right += `<div>Terms: ${esc(doc.terms)}</div>`;
  if (props.showDueDate && !isInvoice && doc.expiry_date) right += `<div>Expires: ${fmtDate(doc.expiry_date)}</div>`;

  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div style="font-size:20px;font-weight:bold;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">${esc(title)}</div>
    <div style="text-align:right;font-size:11px;color:#4b5563;">${right}</div>
  </div>`;
}

function lineItemsHtml(props, data) {
  const items = data.lineItems || [];
  const currency = data.currency || 'AUD';
  const fs2 = props.fontSize || 11;

  // Group by category
  const grouped = {};
  const catOrder = [];
  for (const item of items) {
    const cat = item.category_name || '';
    if (!grouped[cat]) { grouped[cat] = []; catOrder.push(cat); }
    grouped[cat].push(item);
  }

  let html = `<table style="width:100%;font-size:${fs2}px;border-collapse:collapse;">`;
  // Header
  html += `<thead><tr style="background:${props.headerBg || '#f9fafb'};color:${props.headerText || '#374151'};">`;
  html += `<th style="text-align:left;padding:6px 8px;font-weight:500;">Description</th>`;
  html += `<th style="text-align:right;padding:6px 8px;font-weight:500;width:50px;">Qty</th>`;
  html += `<th style="text-align:right;padding:6px 8px;font-weight:500;width:70px;">Rate</th>`;
  if (props.showTaxCol) html += `<th style="text-align:right;padding:6px 8px;font-weight:500;width:60px;">Tax</th>`;
  html += `<th style="text-align:right;padding:6px 8px;font-weight:500;width:80px;">Amount</th>`;
  html += `</tr></thead><tbody>`;

  for (const cat of catOrder) {
    // Category header row
    if (cat) {
      const cols = props.showTaxCol ? 5 : 4;
      html += `<tr><td colspan="${cols}" style="padding:8px 8px 4px;font-weight:bold;text-transform:uppercase;font-size:${fs2}px;background:${props.categoryBg || '#4263eb'};color:${props.categoryText || '#ffffff'};">${esc(cat)}</td></tr>`;
    }
    // Item rows
    grouped[cat].forEach((item, idx) => {
      const bg = props.alternateRows && idx % 2 === 1 ? 'background:#f9fafb;' : '';
      html += `<tr style="border-bottom:1px solid #f3f4f6;${bg}">`;
      html += `<td style="padding:4px 8px;color:#374151;">${esc(item.name)}</td>`;
      html += `<td style="padding:4px 8px;text-align:right;color:#4b5563;">${item.quantity}</td>`;
      html += `<td style="padding:4px 8px;text-align:right;color:#4b5563;">${fmt(item.rate, currency)}</td>`;
      if (props.showTaxCol) html += `<td style="padding:4px 8px;text-align:right;color:#6b7280;">${fmt(item.tax_amount, currency)}</td>`;
      html += `<td style="padding:4px 8px;text-align:right;font-weight:500;">${fmt(item.total, currency)}</td>`;
      html += `</tr>`;
    });
  }

  if (items.length === 0) {
    const cols = props.showTaxCol ? 5 : 4;
    html += `<tr><td colspan="${cols}" style="padding:16px;text-align:center;color:#9ca3af;">No line items</td></tr>`;
  }

  html += `</tbody></table>`;
  return html;
}

function totalsHtml(props, data) {
  const doc = data.document || {};
  const currency = data.currency || 'AUD';
  const align = props.alignment === 'left' ? 'flex-start' : 'flex-end';

  let rows = '';
  if (props.showSubtotal) rows += totalsRow('SUBTOTAL', fmt(doc.subtotal, currency));
  if (props.showMarkup && (doc.markup_total || 0) > 0) rows += totalsRow('MARKUP', `+${fmt(doc.markup_total, currency)}`);
  if (props.showDiscount && (doc.discount_total || 0) > 0) rows += totalsRow('DISCOUNT', `-${fmt(doc.discount_total, currency)}`, '#dc2626');
  if (props.showTax && (doc.tax_total || 0) > 0) rows += totalsRow('GST 10%', fmt(doc.tax_total, currency));
  if (props.showRetainer && (doc.retainer_applied || 0) > 0) rows += totalsRow('RETAINER', `-${fmt(doc.retainer_applied, currency)}`, '#059669');

  const totalStyle = props.highlightTotal ? 'font-weight:bold;font-size:14px;' : 'font-weight:500;';
  rows += `<div style="display:flex;justify-content:space-between;padding-top:4px;border-top:1px solid #d1d5db;${totalStyle}"><span>TOTAL</span><span>${fmt(doc.total, currency)}</span></div>`;

  return `<div style="display:flex;justify-content:${align};"><div style="width:200px;font-size:11px;">${rows}</div></div>`;
}

function totalsRow(label, value, color) {
  const style = color ? `color:${color};` : 'color:#6b7280;';
  return `<div style="display:flex;justify-content:space-between;margin-bottom:4px;${style}"><span>${esc(label)}</span><span>${value}</span></div>`;
}

function notesHtml(props, data) {
  const doc = data.document || {};
  const notes = doc.notes || '';
  if (!notes && !props.showIfEmpty) return '';
  const fs2 = props.fontSize || 10;
  return `<div style="font-size:${fs2}px;">
    <div style="font-size:9px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">${esc(props.sectionLabel || 'NOTES')}</div>
    <div style="color:#4b5563;white-space:pre-wrap;">${esc(notes || 'No notes.')}</div>
  </div>`;
}

function dividerHtml(props) {
  return `<hr style="border:none;border-top:${props.weight || 1}px solid ${props.color || '#e5e7eb'};width:${props.widthPct || 100}%;margin:0;" />`;
}

function textHtml(props) {
  return `<div style="font-size:${props.fontSize || 12}px;color:${props.color || '#374151'};text-align:${props.alignment || 'left'};font-weight:${props.bold ? 'bold' : 'normal'};">${esc(props.content || '')}</div>`;
}

module.exports = { generate, renderToHtml };
