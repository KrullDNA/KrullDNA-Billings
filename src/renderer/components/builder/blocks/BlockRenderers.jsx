import React from 'react';

const CURRENCY_SYMBOLS = { AUD: '$', USD: 'US$', EUR: '\u20ac', GBP: '\u00a3', NZD: 'NZ$', CAD: 'CA$', SGD: 'S$' };
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
  const style = { paddingTop: props.paddingTop || 0, paddingBottom: props.paddingBottom || 0, fontFamily: FONT, color: '#000' };
  const tight = { fontFamily: FONT, color: '#000' }; // no padding — layout controls spacing

  switch (type) {
    case 'header_block': return <HeaderBlock props={props} data={data} style={tight} />;
    case 'client_block': return <ClientBlock props={props} data={data} style={style} />;
    case 'doc_title_block': return <DocTitleBlock props={props} data={data} style={tight} />;
    case 'line_items_block': return <LineItemsBlock props={props} data={data} style={tight} />;
    case 'totals_block': return <TotalsBlock props={props} data={data} style={tight} />;
    case 'notes_block': return <NotesBlock props={props} data={data} style={style} />;
    case 'divider_block': return <DividerBlock props={props} style={style} />;
    case 'spacer_block': return <SpacerBlock props={props} />;
    case 'text_block': return <TextBlock props={props} data={data} style={style} />;
    case 'footer_block': return <FooterBlock props={props} data={data} style={tight} />;
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

      {/* Right: logo — pulls from settings.logo_path */}
      {props.showLogo && (
        settings.logo_path ? (
          <img src={`file://${settings.logo_path}`} style={{ width: 80, height: 80, objectFit: 'contain', flexShrink: 0 }} alt="Logo" />
        ) : (
        <div style={{ width: 80, height: 80, backgroundColor: '#1a1a1a', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, textAlign: 'center', flexShrink: 0, letterSpacing: '0.15em' }}>
          <div>
            <div style={{ fontWeight: 300, fontSize: 11, letterSpacing: '0.25em' }}>K R U L L</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>D+A</div>
          </div>
        </div>
        )
      )}
    </div>
  );
}

function LabelRow({ label, value }) {
  return (
    <tr>
      <td style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', textAlign: 'right', paddingRight: 6, paddingBottom: 0, letterSpacing: '0.05em', whiteSpace: 'nowrap', lineHeight: 1.15 }}>{label}:</td>
      <td style={{ fontSize: 11, paddingBottom: 0, lineHeight: 1.15 }}>{value}</td>
    </tr>
  );
}

// ── Doc Title: DESCRIPTION / AMOUNT column header bar ──

function DocTitleBlock({ props, data, style }) {
  return (
    <div style={{ ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#111', color: '#fff', padding: '6px 8px' }}>
        <span style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {props.titleLabel || 'DESCRIPTION'}
        </span>
        <span style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', width: 110, textAlign: 'right', paddingRight: 12, flexShrink: 0 }}>
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
      <p style={{ fontSize: 9, fontWeight: 700, color: '#333', textTransform: 'uppercase', marginBottom: 3 }}>{props.sectionLabel || 'BILL TO'}</p>
      {client.company && <p style={{ fontWeight: 500 }}>{client.company}</p>}
      {contactName && <p style={{ color: '#000', fontSize: (props.fontSize || 11) - 1 }}>{contactName}</p>}
      {client.address_street && <p style={{ color: '#000', fontSize: (props.fontSize || 11) - 1 }}>{client.address_street}</p>}
      {(client.address_city || client.address_state) && (
        <p style={{ color: '#000', fontSize: (props.fontSize || 11) - 1 }}>{[client.address_city, client.address_state, client.address_postcode].filter(Boolean).join(', ')}</p>
      )}
      {props.showEmail && client.email && <p style={{ color: '#000', fontSize: (props.fontSize || 11) - 1 }}>{client.email}</p>}
      {props.showPhone && client.phone && <p style={{ color: '#000', fontSize: (props.fontSize || 11) - 1 }}>{client.phone}</p>}
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

  // Flatten all items with their category info for sequential rendering
  const allItems = [];
  for (const cat of catOrder) {
    grouped[cat].forEach((item, idx) => {
      allItems.push({ ...item, _cat: cat, _isFirstInCat: idx === 0 });
    });
  }

  return (
    <div style={style}>
      {allItems.map((item, i) => (
        <div key={item.id || i}>
          {/* Light grey divider between items (black for first item in new category group) */}
          {i > 0 && (
            <hr style={{ border: 'none', borderTop: item._isFirstInCat && item._cat ? '1px solid #111' : '1px solid #e5e7eb', margin: '8px 0' }} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '4px 8px' }}>
            <div style={{ flex: 1, paddingRight: 16 }}>
              {item._cat && item._isFirstInCat && (
                <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', marginBottom: 1, letterSpacing: '0.02em' }}>{item._cat}</div>
              )}
              <div style={{ fontSize: 11, color: '#000' }}>{item.name}</div>
              {item.notes && (
                <div style={{ fontSize: 9, color: '#333', marginTop: 3, lineHeight: 1.1, whiteSpace: 'pre-wrap' }}>{item.notes}</div>
              )}
            </div>
            <div style={{ fontSize: 11, textAlign: 'right', width: 110, paddingRight: 12, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(item.subtotal || item.total, currency)}
            </div>
          </div>
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
          <tr style={{ backgroundColor: '#111', color: '#fff' }}>
            <td style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700, fontSize: 11 }}>TOTAL</td>
            <td style={{ textAlign: 'right', padding: '6px 12px 6px 0', fontWeight: 700, fontSize: 11, width: 110, fontVariantNumeric: 'tabular-nums' }}>{fmt(doc.total, currency)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TotalsRow({ label, value }) {
  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ textAlign: 'right', padding: '5px 12px', color: '#000', fontSize: 11 }}>{label}</td>
      <td style={{ textAlign: 'right', padding: '5px 12px 5px 0', fontSize: 11, width: 110, fontVariantNumeric: 'tabular-nums' }}>{value}</td>
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
      {notes && <div style={{ color: '#000', whiteSpace: 'pre-wrap' }}>{notes}</div>}
    </div>
  );
}

// ── Footer: business info (auto-renders from settings when content is empty) ──

function TextBlock({ props, data, style }) {
  const settings = data?.settings || {};

  // Auto-generate business footer if content is empty
  if (!props.content && settings.business_name) {
    const parts = [];
    let line1 = '';
    if (settings.business_name) line1 += settings.business_name;
    if (settings.abn) line1 += ` \u2022 ABN: ${settings.abn}`;
    parts.push(line1);

    const addrParts = [settings.address_street, [settings.address_city, settings.address_state, settings.address_postcode].filter(Boolean).join(', '), settings.address_country].filter(Boolean);
    if (addrParts.length) parts.push(addrParts.join(', '));

    const contactParts = [];
    if (settings.phone) contactParts.push(`T: ${settings.phone}`);
    if (settings.email) contactParts.push(`E: ${settings.email}`);
    if (settings.website) contactParts.push(`W: ${settings.website}`);
    if (contactParts.length) parts.push(contactParts.join('    \u2022    '));

    return (
      <div style={{ ...style, fontSize: props.fontSize || 9, color: '#000' }}>
        {parts.map((line, i) => (
          <div key={i} style={{ fontWeight: i === 0 ? 700 : 400 }}>{line}</div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ ...style, fontSize: props.fontSize || 10, color: props.color || '#374151', textAlign: props.alignment || 'left', fontWeight: props.bold ? 'bold' : 'normal' }}>
      {props.content || ''}
    </div>
  );
}

function FooterBlock({ props, data, style }) {
  const settings = data?.settings || {};
  const doc = data?.document || {};
  const isEstimate = data?.docType === 'estimate';

  return (
    <div style={{ ...style, fontSize: 10 }}>
      {/* Estimate: signature lines + disclosure */}
      {isEstimate && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8, marginTop: 10, fontSize: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4 }}>CLIENT SIGNATURE:</div>
              <div style={{ borderBottom: '1px solid #111', height: 20 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4 }}>PRINT:</div>
              <div style={{ borderBottom: '1px solid #111', height: 20 }} />
            </div>
            <div style={{ flex: 0.7 }}>
              <div style={{ marginBottom: 4 }}>DATE:</div>
              <div style={{ borderBottom: '1px solid #111', height: 20 }} />
            </div>
          </div>
          {settings.estimate_disclosure && (
            <div style={{ fontSize: 7, color: '#000', lineHeight: 1.2, marginBottom: 6 }}>
              {settings.estimate_disclosure}
            </div>
          )}
        </>
      )}
      {/* Invoice: terms + banking */}
      {!isEstimate && (
        <>
          {(doc.terms || props.defaultTerms) && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 700, letterSpacing: '0.02em' }}>TERMS: </span>
              <span>{doc.terms || props.defaultTerms}</span>
            </div>
          )}
          {settings.bank_name && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700, marginBottom: 0, letterSpacing: '0.02em' }}>BANKING DETAILS:</div>
              <table style={{ fontSize: 10, borderCollapse: 'collapse', lineHeight: 1.15 }}>
                <tbody>
                  {settings.bank_name && <tr><td style={{ fontWeight: 500, textAlign: 'right', paddingRight: 4 }}>BANK:</td><td>{settings.bank_name}</td></tr>}
                  {settings.bank_account_name && <tr><td style={{ fontWeight: 500, textAlign: 'right', paddingRight: 4 }}>NAME:</td><td>{settings.bank_account_name}</td></tr>}
                  {settings.bank_bsb && <tr><td style={{ fontWeight: 500, textAlign: 'right', paddingRight: 4 }}>BSB:</td><td>{settings.bank_bsb}</td></tr>}
                  {settings.bank_account && <tr><td style={{ fontWeight: 500, textAlign: 'right', paddingRight: 4 }}>ACCOUNT:</td><td>{settings.bank_account}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {/* Business info footer — always shown */}
      {settings.business_name && (
        <div style={{ fontSize: 9 }}>
          <div style={{ fontWeight: 700 }}>
            {settings.business_name}{settings.abn ? ` \u2022 ABN: ${settings.abn}` : ''}
          </div>
          {(() => {
            const addrParts = [settings.address_street, [settings.address_city, settings.address_state, settings.address_postcode].filter(Boolean).join(', '), settings.address_country].filter(Boolean);
            return addrParts.length ? <div>{addrParts.join(', ')}</div> : null;
          })()}
          <div>
            {[
              settings.phone ? `T: ${settings.phone}` : null,
              settings.email ? `E: ${settings.email}` : null,
              settings.website ? `W: ${settings.website}` : null,
            ].filter(Boolean).join('    \u2022    ')}
          </div>
        </div>
      )}
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
