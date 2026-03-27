const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');
const db = require('./db');

const CURRENCY_SYMBOLS = { AUD: '$', USD: 'US$', EUR: '\u20ac', GBP: '\u00a3', NZD: 'NZ$', CAD: 'CA$', SGD: 'S$' };

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

  // Add project name to document data
  if (doc.project_id) {
    const project = db.getProject(doc.project_id);
    if (project) doc.project_name = project.name;
  }

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

  const clientName = (client.is_company ? client.company : `${client.first_name} ${client.last_name}`).trim();
  const projectName = doc.project_name || '';
  const docNumber = isInvoice ? doc.invoice_number : doc.estimate_number;

  // Build filename from pattern in settings
  const defaultPattern = isInvoice
    ? '%clientName% %projectName% Invoice %invNum%'
    : '%clientName% %projectName% Estimate %estNum%';
  const pattern = (isInvoice ? settings.invoice_filename_pattern : settings.estimate_filename_pattern) || defaultPattern;

  const filename = pattern
    .replace('%clientName%', clientName)
    .replace('%projectName%', projectName)
    .replace('%invNum%', docNumber || '')
    .replace('%estNum%', docNumber || '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim() + '.pdf';

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

  const paidStamp = isPaid ? `
    <div style="position:fixed;top:120px;right:60px;width:160px;height:160px;transform:rotate(-18deg);pointer-events:none;z-index:100;">
      <div style="width:150px;height:150px;border:5px solid #dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <span style="color:#dc2626;font-weight:bold;font-size:20px;text-align:center;line-height:1.2;">PAID<br>IN FULL</span>
      </div>
    </div>
  ` : '';

  // Split blocks into body and footer (footer_block always goes at page bottom)
  let mainHtml = '';
  let footerHtml = '';
  for (const block of blocks) {
    if (block.type === 'footer_block') {
      footerHtml += renderBlockToHtml(block, data);
    } else {
      mainHtml += renderBlockToHtml(block, data);
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Gotham', 'Gotham Rounded', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #111827; line-height: 1.5; }
  table { border-collapse: collapse; }
  @page { margin: 15mm; }
  .page-footer { position: fixed; bottom: 0; left: 0; right: 0; }
</style>
</head>
<body>
${paidStamp}
${mainHtml}
${footerHtml ? `<div class="page-footer">${footerHtml}</div>` : ''}
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
    case 'text_block': return wrap(textHtml(props, data));
    case 'footer_block': return wrap(footerHtml(props, data));
    default: return '';
  }
}

function headerHtml(props, data) {
  const s = data.settings || {};
  const doc = data.document || {};
  const c = data.client || {};
  const isInvoice = data.docType === 'invoice';
  const contactName = [c.first_name, c.last_name].filter(Boolean).join(' ');

  // Logo — embedded base64 or placeholder
  let logoHtml = '';
  if (props.showLogo) {
    const logoPath = s.logo_path;
    if (logoPath && fs.existsSync(logoPath)) {
      const ext = path.extname(logoPath).slice(1).toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
      const b64 = fs.readFileSync(logoPath).toString('base64');
      logoHtml = `<img src="data:${mime};base64,${b64}" style="width:80px;height:80px;object-fit:contain;" />`;
    } else {
      logoHtml = `<div style="width:80px;height:80px;background:#1a1a1a;border-radius:2px;display:flex;align-items:center;justify-content:center;color:#fff;text-align:center;"><div><div style="font-weight:300;font-size:11px;letter-spacing:0.25em;">K R U L L</div><div style="font-weight:700;font-size:14px;">D+A</div></div></div>`;
    }
  }

  // Label:value pairs
  let rows = '';
  rows += labelRow(isInvoice ? 'TAX INVOICE' : 'ESTIMATE', esc(isInvoice ? doc.invoice_number : doc.estimate_number) || '');
  if (c.company) rows += labelRow('CLIENT', esc(c.company));
  if (contactName) rows += labelRow('ATTENTION', esc(contactName));
  if (doc.project_name) rows += labelRow('DESCRIPTION', esc(doc.project_name));
  rows += labelRow('DATE', fmtDate(isInvoice ? doc.invoice_date : doc.estimate_date));

  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <table style="border-collapse:collapse;"><tbody>${rows}</tbody></table>
    ${logoHtml}
  </div>`;
}

function labelRow(label, value) {
  return `<tr><td style="font-weight:700;font-size:10px;text-transform:uppercase;text-align:right;padding-right:8px;padding-bottom:0;letter-spacing:0.05em;white-space:nowrap;line-height:1.3;">${label}:</td><td style="font-size:11px;padding-bottom:0;line-height:1.3;">${value}</td></tr>`;
}

function clientHtml(props, data) {
  const c = data.client || {};
  const contactName = [c.first_name, c.last_name].filter(Boolean).join(' ');
  const fs2 = props.fontSize || 11;
  let html = `<div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:3px;letter-spacing:0.02em;">${esc(props.sectionLabel || 'BILL TO')}</div>`;
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
  const title = props.titleLabel || 'DESCRIPTION';
  return `<div style="display:flex;justify-content:space-between;background:#111;color:#fff;padding:6px 0;">
    <span style="font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">${esc(title)}</span>
    <span style="font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;width:110px;text-align:right;padding-right:12px;flex-shrink:0;">AMOUNT</span>
  </div>`;
}

function lineItemsHtml(props, data) {
  const items = data.lineItems || [];
  const currency = data.currency || 'AUD';

  const grouped = {};
  const catOrder = [];
  for (const item of items) {
    const cat = item.category_name || '';
    if (!grouped[cat]) { grouped[cat] = []; catOrder.push(cat); }
    grouped[cat].push(item);
  }

  // Flatten all items with category info
  const allItems = [];
  for (const cat of catOrder) {
    grouped[cat].forEach((item, idx) => {
      allItems.push({ ...item, _cat: cat, _isFirstInCat: idx === 0 });
    });
  }

  let html = '';
  allItems.forEach((item, i) => {
    // Divider: black for new category group, light grey between items within a group
    if (i > 0) {
      const divColor = item._isFirstInCat && item._cat ? '#111' : '#e5e7eb';
      html += `<hr style="border:none;border-top:1px solid ${divColor};margin:12px 0;" />`;
    }
    html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:4px 0;">`;
    html += `<div style="flex:1;padding-right:16px;">`;
    if (item._cat && item._isFirstInCat) html += `<div style="font-weight:700;font-size:11px;text-transform:uppercase;margin-bottom:2px;letter-spacing:0.02em;">${esc(item._cat)}</div>`;
    html += `<div style="font-size:11px;color:#374151;">${esc(item.name)}</div>`;
    // Comments/notes under description
    if (item.notes) html += `<div style="font-size:10px;color:#6b7280;margin-top:6px;line-height:1.5;">${esc(item.notes)}</div>`;
    html += `</div>`;
    html += `<div style="font-size:11px;text-align:right;width:110px;padding-right:12px;flex-shrink:0;">${fmt(item.total, currency)}</div>`;
    html += `</div>`;
  });

  if (items.length === 0) html += `<div style="padding:16px 0;text-align:center;color:#9ca3af;font-size:11px;">No line items</div>`;
  return html;
}

function totalsHtml(props, data) {
  const doc = data.document || {};
  const currency = data.currency || 'AUD';

  let rows = '';
  rows += `<hr style="border:none;border-top:1px solid #111;margin-bottom:0;" />`;
  rows += `<table style="width:100%;font-size:11px;border-collapse:collapse;">`;
  if (props.showSubtotal) rows += totalsRowHtml('SUBTOTAL', fmt(doc.subtotal, currency));
  if (props.showMarkup && (doc.markup_total || 0) > 0) rows += totalsRowHtml('MARKUP', fmt(doc.markup_total, currency));
  if (props.showDiscount && (doc.discount_total || 0) > 0) rows += totalsRowHtml('DISCOUNT', `-${fmt(doc.discount_total, currency)}`);
  if (props.showTax && (doc.tax_total || 0) > 0) rows += totalsRowHtml('GST 10%', fmt(doc.tax_total, currency));
  if (props.showRetainer && (doc.retainer_applied || 0) > 0) rows += totalsRowHtml('RETAINER', `-${fmt(doc.retainer_applied, currency)}`);

  rows += `<tr style="background:#111;color:#fff;"><td style="text-align:right;padding:6px 12px;font-weight:700;font-size:11px;">TOTAL</td><td style="text-align:right;padding:6px 12px 6px 0;font-weight:700;font-size:11px;width:110px;">${fmt(doc.total, currency)}</td></tr>`;
  rows += `</table>`;
  return rows;
}

function totalsRowHtml(label, value) {
  return `<tr style="border-bottom:1px solid #e5e7eb;"><td style="text-align:right;padding:5px 12px;color:#374151;font-size:11px;">${label}</td><td style="text-align:right;padding:5px 12px 5px 0;font-size:11px;width:110px;">${value}</td></tr>`;
}

function notesHtml(props, data) {
  const doc = data.document || {};
  const s = data.settings || {};
  const notes = doc.notes || '';
  if (!notes && !props.showIfEmpty && !s.bank_name) return '';

  let html = '';
  // Terms
  if (doc.terms) html += `<div style="margin-bottom:12px;font-size:10px;"><span style="font-weight:700;letter-spacing:0.02em;">TERMS: </span>${esc(doc.terms)}</div>`;

  // Banking details
  if (s.bank_name) {
    html += `<div style="margin-bottom:12px;font-size:10px;"><div style="font-weight:700;margin-bottom:2px;letter-spacing:0.02em;">BANKING DETAILS:</div>`;
    html += `<table style="font-size:10px;border-collapse:collapse;">`;
    if (s.bank_name) html += `<tr><td style="font-weight:500;text-align:right;padding-right:6px;">BANK:</td><td>${esc(s.bank_name)}</td></tr>`;
    if (s.bank_account_name) html += `<tr><td style="font-weight:500;text-align:right;padding-right:6px;">NAME:</td><td>${esc(s.bank_account_name)}</td></tr>`;
    if (s.bank_bsb) html += `<tr><td style="font-weight:500;text-align:right;padding-right:6px;">BSB:</td><td>${esc(s.bank_bsb)}</td></tr>`;
    if (s.bank_account) html += `<tr><td style="font-weight:500;text-align:right;padding-right:6px;">ACCOUNT:</td><td>${esc(s.bank_account)}</td></tr>`;
    html += `</table></div>`;
  }

  if (notes) html += `<div style="color:#4b5563;white-space:pre-wrap;font-size:10px;">${esc(notes)}</div>`;
  return html;
}

function dividerHtml(props) {
  return `<hr style="border:none;border-top:${props.weight || 1}px solid ${props.color || '#111'};width:${props.widthPct || 100}%;margin:0;" />`;
}

function textHtml(props, data) {
  const s = (data && data.settings) || {};

  // Auto-generate business footer if content is empty
  if (!props.content && s.business_name) {
    let line1 = `<strong>${esc(s.business_name)}</strong>`;
    if (s.abn) line1 += ` &bull; <strong>ABN</strong>: ${esc(s.abn)}`;

    const addrParts = [s.address_street, [s.address_city, s.address_state, s.address_postcode].filter(Boolean).join(', '), s.address_country].filter(Boolean);
    const addrLine = addrParts.length ? `<div>${esc(addrParts.join(', '))}</div>` : '';

    const contactParts = [];
    if (s.phone) contactParts.push(`<strong>T:</strong> ${esc(s.phone)}`);
    if (s.email) contactParts.push(`<strong>E:</strong> ${esc(s.email)}`);
    if (s.website) contactParts.push(`<strong>W:</strong> ${esc(s.website)}`);
    const contactLine = contactParts.length ? `<div>${contactParts.join('&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;')}</div>` : '';

    return `<div style="font-size:${props.fontSize || 9}px;color:#374151;">${line1}${addrLine}${contactLine}</div>`;
  }

  return `<div style="font-size:${props.fontSize || 10}px;color:${props.color || '#374151'};text-align:${props.alignment || 'left'};font-weight:${props.bold ? 'bold' : 'normal'};">${esc(props.content || '')}</div>`;
}

function footerHtml(props, data) {
  const s = (data && data.settings) || {};
  const doc = (data && data.document) || {};
  const isEstimate = data && data.docType === 'estimate';
  let html = '';

  // Estimate: signature lines + disclosure
  if (isEstimate) {
    html += `<div style="display:flex;gap:16px;margin:16px 0 12px;font-size:10px;">`;
    html += `<div style="flex:1;"><div style="margin-bottom:4px;">CLIENT SIGNATURE:</div><div style="border-bottom:1px solid #111;height:20px;"></div></div>`;
    html += `<div style="flex:1;"><div style="margin-bottom:4px;">PRINT:</div><div style="border-bottom:1px solid #111;height:20px;"></div></div>`;
    html += `<div style="flex:0.7;"><div style="margin-bottom:4px;">DATE:</div><div style="border-bottom:1px solid #111;height:20px;"></div></div>`;
    html += `</div>`;
    if (s.estimate_disclosure) {
      html += `<div style="font-size:8px;color:#374151;line-height:1.4;margin-bottom:12px;">${esc(s.estimate_disclosure)}</div>`;
    }
  }

  // Invoice: terms + banking
  if (!isEstimate) {
    const terms = doc.terms || props.defaultTerms;
    if (terms) html += `<div style="margin-bottom:12px;font-size:10px;"><strong>TERMS: </strong>${esc(terms)}</div>`;

    if (s.bank_name) {
      html += `<div style="margin-bottom:16px;font-size:10px;"><div style="font-weight:700;margin-bottom:2px;letter-spacing:0.02em;">BANKING DETAILS:</div>`;
      html += `<table style="font-size:10px;border-collapse:collapse;">`;
      if (s.bank_name) html += `<tr><td style="font-weight:500;text-align:right;padding-right:6px;">BANK:</td><td>${esc(s.bank_name)}</td></tr>`;
      if (s.bank_account_name) html += `<tr><td style="font-weight:500;text-align:right;padding-right:6px;">NAME:</td><td>${esc(s.bank_account_name)}</td></tr>`;
      if (s.bank_bsb) html += `<tr><td style="font-weight:500;text-align:right;padding-right:6px;">BSB:</td><td>${esc(s.bank_bsb)}</td></tr>`;
      if (s.bank_account) html += `<tr><td style="font-weight:500;text-align:right;padding-right:6px;">ACCOUNT:</td><td>${esc(s.bank_account)}</td></tr>`;
      html += `</table></div>`;
    }
  }

  // Business footer — always shown
  if (s.business_name) {
    let line1 = `<strong>${esc(s.business_name)}</strong>`;
    if (s.abn) line1 += ` &bull; <strong>ABN</strong>: ${esc(s.abn)}`;
    html += `<div style="font-size:9px;">${line1}`;
    const addrParts = [s.address_street, [s.address_city, s.address_state, s.address_postcode].filter(Boolean).join(', '), s.address_country].filter(Boolean);
    if (addrParts.length) html += `<br>${esc(addrParts.join(', '))}`;
    const contactParts = [];
    if (s.phone) contactParts.push(`<strong>T:</strong> ${esc(s.phone)}`);
    if (s.email) contactParts.push(`<strong>E:</strong> ${esc(s.email)}`);
    if (s.website) contactParts.push(`<strong>W:</strong> ${esc(s.website)}`);
    if (contactParts.length) html += `<br>${contactParts.join('&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;')}`;
    html += `</div>`;
  }

  return html;
}

module.exports = { generate, renderToHtml };
