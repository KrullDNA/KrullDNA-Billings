import React from 'react';

const CURRENCY_SYMBOLS = { AUD: '$', USD: '$', EUR: '\u20ac', GBP: '\u00a3', NZD: '$', CAD: '$', SGD: '$' };
function fmt(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const FONT = "'Gotham', 'Gotham Rounded', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function renderBlock(block, data) {
  const { type, props } = block;
  const style = { paddingTop: props.paddingTop || 0, paddingBottom: props.paddingBottom || 0, fontFamily: FONT };

  switch (type) {
    case 'header_block': return <HeaderBlock props={props} data={data} style={style} />;
    case 'client_block': return <ClientBlock props={props} data={data} style={style} />;
    case 'doc_title_block': return <DocTitleBlock props={props} data={data} style={style} />;
    case 'line_items_block': return <LineItemsBlock props={props} data={data} style={style} />;
    case 'totals_block': return <TotalsBlock props={props} data={data} style={style} />;
    case 'notes_block': return <NotesBlock props={props} data={data} style={style} />;
    case 'divider_block': return <DividerBlock props={props} style={style} />;
    case 'spacer_block': return <SpacerBlock props={props} />;
    case 'text_block': return <TextBlock props={props} style={style} />;
    default: return <div style={style} className="text-xs text-red-400">Unknown block: {type}</div>;
  }
}

// ── Header: label:value pairs left, logo top-right ──

function HeaderBlock({ props, data, style }) {
  const settings = data.settings || {};
  const doc = data.document || {};
  const client = data.client || {};
  const isInvoice = data.docType === 'invoice';
  const contactName = [client.first_name, client.last_name].filter(Boolean).join(' ');

  return (
    <div style={{ ...style, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      {/* Left: label-value pairs */}
      <div style={{ fontSize: 11 }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <LabelRow label={isInvoice ? 'TAX INVOICE' : 'ESTIMATE'} value={isInvoice ? doc.invoice_number : doc.estimate_number || ''} />
            {client.company && <LabelRow label="CLIENT" value={client.company} />}
            {contactName && <LabelRow label="ATTENTION" value={contactName} />}
            {doc.project_name && <LabelRow label="DESCRIPTION" value={doc.project_name} />}
            <LabelRow label="DATE" value={fmtDate(isInvoice ? doc.invoice_date : doc.estimate_date)} />
          </tbody>
        </table>
      </div>

      {/* Right: logo */}
      {props.showLogo && (
        <div style={{ width: 80, height: 80, backgroundColor: '#1a1a1a', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, textAlign: 'center', flexShrink: 0, letterSpacing: '0.15em' }}>
          <div>
            <div style={{ fontWeight: 300, fontSize: 11, letterSpacing: '0.25em' }}>K R U L L</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>D+A</div>
          </div>
        </div>
      )}
    </div>
  );
}

function LabelRow({ label, value }) {
  return (
    <tr>
      <td style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', textAlign: 'right', paddingRight: 8, paddingBottom: 2, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{label}:</td>
      <td style={{ fontSize: 11, paddingBottom: 2 }}>{value}</td>
    </tr>
  );
}

// ── Doc Title: DESCRIPTION / AMOUNT column header bar ──

function DocTitleBlock({ props, data, style }) {
  return (
    <div style={{ ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111', paddingBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {props.titleLabel || 'DESCRIPTION'}
        </span>
        <span style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          AMOUNT
        </span>
      </div>
    </div>
  );
}

// ── Client Block (not used in KD layout, kept for flexibility) ──

function ClientBlock({ props, data, style }) {
  const client = data.client || {};
  const contactName = [client.first_name, client.last_name].filter(Boolean).join(' ');
  return (
    <div style={{ ...style, fontSize: props.fontSize || 11 }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 }}>{props.sectionLabel || 'BILL TO'}</p>
      {client.company && <p style={{ fontWeight: 500 }}>{client.company}</p>}
      {contactName && <p style={{ color: '#4b5563', fontSize: (props.fontSize || 11) - 1 }}>{contactName}</p>}
      {client.address_street && <p style={{ color: '#4b5563', fontSize: (props.fontSize || 11) - 1 }}>{client.address_street}</p>}
      {(client.address_city || client.address_state) && (
        <p style={{ color: '#4b5563', fontSize: (props.fontSize || 11) - 1 }}>{[client.address_city, client.address_state, client.address_postcode].filter(Boolean).join(', ')}</p>
      )}
      {props.showEmail && client.email && <p style={{ color: '#4b5563', fontSize: (props.fontSize || 11) - 1 }}>{client.email}</p>}
      {props.showPhone && client.phone && <p style={{ color: '#4b5563', fontSize: (props.fontSize || 11) - 1 }}>{client.phone}</p>}
    </div>
  );
}

// ── Line Items: category bold header, description below, amount right, dividers ──

function LineItemsBlock({ props, data, style }) {
  const items = data.lineItems || [];
  const currency = data.currency || 'AUD';

  const grouped = {};
  const catOrder = [];
  for (const item of items) {
    const cat = item.category_name || '';
    if (!grouped[cat]) { grouped[cat] = []; catOrder.push(cat); }
    grouped[cat].push(item);
  }

  return (
    <div style={style}>
      {catOrder.map((cat, catIdx) => (
        <div key={cat || '__none'}>
          {/* Divider between groups */}
          {catIdx > 0 && <hr style={{ border: 'none', borderTop: '1px solid #111', margin: '16px 0' }} />}

          {grouped[cat].map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0' }}>
              <div style={{ flex: 1 }}>
                {/* Category as bold header */}
                {cat && idx === 0 && (
                  <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.02em' }}>{cat}</div>
                )}
                <div style={{ fontSize: 11, color: '#374151' }}>{item.name}</div>
              </div>
              <div style={{ fontSize: 11, textAlign: 'right', minWidth: 90, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(item.total, currency)}
              </div>
            </div>
          ))}
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ padding: '16px 0', textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>No line items</div>
      )}
    </div>
  );
}

// ── Totals: right-aligned table with TOTAL row highlighted ──

function TotalsBlock({ props, data, style }) {
  const doc = data.document || {};
  const currency = data.currency || 'AUD';

  return (
    <div style={{ ...style }}>
      <hr style={{ border: 'none', borderTop: '1px solid #111', marginBottom: 0 }} />
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <tbody>
          {props.showSubtotal && (
            <TotalsRow label="SUBTOTAL" value={fmt(doc.subtotal, currency)} />
          )}
          {props.showMarkup && (doc.markup_total || 0) > 0 && (
            <TotalsRow label="MARKUP" value={fmt(doc.markup_total, currency)} />
          )}
          {props.showDiscount && (doc.discount_total || 0) > 0 && (
            <TotalsRow label="DISCOUNT" value={`-${fmt(doc.discount_total, currency)}`} />
          )}
          {props.showTax && (doc.tax_total || 0) > 0 && (
            <TotalsRow label="GST 10%" value={fmt(doc.tax_total, currency)} />
          )}
          {props.showRetainer && (doc.retainer_applied || 0) > 0 && (
            <TotalsRow label="RETAINER" value={`-${fmt(doc.retainer_applied, currency)}`} />
          )}
          <tr style={{ backgroundColor: props.highlightTotal ? '#f3f4f6' : 'transparent' }}>
            <td style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700, fontSize: 11 }}>TOTAL</td>
            <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, fontSize: 11, width: 100, fontVariantNumeric: 'tabular-nums' }}>{fmt(doc.total, currency)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TotalsRow({ label, value }) {
  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ textAlign: 'right', padding: '5px 12px', color: '#374151', fontSize: 11 }}>{label}</td>
      <td style={{ textAlign: 'right', padding: '5px 0', fontSize: 11, width: 100, fontVariantNumeric: 'tabular-nums' }}>{value}</td>
    </tr>
  );
}

// ── Notes: Terms + Banking Details ──

function NotesBlock({ props, data, style }) {
  const doc = data.document || {};
  const settings = data.settings || {};
  const notes = doc.notes || '';
  if (!notes && !props.showIfEmpty && !settings.bank_name) return null;

  return (
    <div style={{ ...style, fontSize: props.fontSize || 10 }}>
      {/* Terms */}
      {doc.terms && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.02em' }}>TERMS: </span>
          <span style={{ fontSize: 10 }}>{doc.terms}</span>
        </div>
      )}
      {/* Banking details */}
      {settings.bank_name && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 2, letterSpacing: '0.02em' }}>BANKING DETAILS:</div>
          <table style={{ fontSize: 10, borderCollapse: 'collapse' }}>
            <tbody>
              {settings.bank_name && <tr><td style={{ fontWeight: 500, textAlign: 'right', paddingRight: 6 }}>BANK:</td><td>{settings.bank_name}</td></tr>}
              {settings.bank_account_name && <tr><td style={{ fontWeight: 500, textAlign: 'right', paddingRight: 6 }}>NAME:</td><td>{settings.bank_account_name}</td></tr>}
              {settings.bank_bsb && <tr><td style={{ fontWeight: 500, textAlign: 'right', paddingRight: 6 }}>BSB:</td><td>{settings.bank_bsb}</td></tr>}
              {settings.bank_account && <tr><td style={{ fontWeight: 500, textAlign: 'right', paddingRight: 6 }}>ACCOUNT:</td><td>{settings.bank_account}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {/* Custom notes */}
      {notes && <div style={{ color: '#4b5563', whiteSpace: 'pre-wrap' }}>{notes}</div>}
    </div>
  );
}

// ── Footer: business info line ──

function TextBlock({ props, style }) {
  return (
    <div style={{ ...style, fontSize: props.fontSize || 10, color: props.color || '#374151', textAlign: props.alignment || 'left', fontWeight: props.bold ? 'bold' : 'normal' }}>
      {props.content || ''}
    </div>
  );
}

function DividerBlock({ props, style }) {
  return (
    <div style={style}>
      <hr style={{ border: 'none', borderTop: `${props.weight || 1}px solid ${props.color || '#111'}`, width: `${props.widthPct || 100}%`, margin: 0 }} />
    </div>
  );
}

function SpacerBlock({ props }) {
  return <div style={{ height: props.height || 24 }} />;
}
