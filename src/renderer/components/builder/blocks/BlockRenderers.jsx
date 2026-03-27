import React from 'react';

const CURRENCY_SYMBOLS = { AUD: '$', USD: '$', EUR: '\u20ac', GBP: '\u00a3', NZD: '$', CAD: '$', SGD: '$' };
function fmt(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderBlock(block, data) {
  const { type, props } = block;
  const style = { paddingTop: props.paddingTop || 0, paddingBottom: props.paddingBottom || 0 };

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

function HeaderBlock({ props, data, style }) {
  const settings = data.settings || {};
  return (
    <div style={{ ...style, backgroundColor: props.bgColor, color: props.textColor }} className="flex items-start justify-between">
      <div className={`flex items-start gap-4 ${props.logoAlign === 'right' ? 'flex-row-reverse w-full' : ''}`}>
        {props.showLogo && (
          <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">Logo</div>
        )}
        <div>
          {props.showBusinessName && <p className="text-lg font-bold">{settings.business_name || 'Krull D+A'}</p>}
          {props.showAbn && settings.abn && <p className="text-[10px] opacity-70">ABN: {settings.abn}</p>}
          {props.showContact && (
            <div className="text-[10px] opacity-70 mt-1">
              {settings.email && <p>{settings.email}</p>}
              {settings.phone && <p>{settings.phone}</p>}
              {settings.address_street && <p>{settings.address_street}</p>}
              {(settings.address_city || settings.address_state) && (
                <p>{[settings.address_city, settings.address_state, settings.address_postcode].filter(Boolean).join(', ')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientBlock({ props, data, style }) {
  const client = data.client || {};
  const contactName = [client.first_name, client.last_name].filter(Boolean).join(' ');
  return (
    <div style={{ ...style, fontSize: props.fontSize }}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{props.sectionLabel || 'BILL TO'}</p>
      {client.company && <p className="font-medium">{client.company}</p>}
      {contactName && <p className={client.company ? 'text-gray-600' : 'font-medium'} style={{ fontSize: client.company ? props.fontSize - 1 : props.fontSize }}>{contactName}</p>}
      {client.address_street && <p className="text-gray-600" style={{ fontSize: props.fontSize - 1 }}>{client.address_street}</p>}
      {(client.address_city || client.address_state) && (
        <p className="text-gray-600" style={{ fontSize: props.fontSize - 1 }}>{[client.address_city, client.address_state, client.address_postcode].filter(Boolean).join(', ')}</p>
      )}
      {props.showEmail && client.email && <p className="text-gray-600" style={{ fontSize: props.fontSize - 1 }}>{client.email}</p>}
      {props.showPhone && client.phone && <p className="text-gray-600" style={{ fontSize: props.fontSize - 1 }}>{client.phone}</p>}
    </div>
  );
}

function DocTitleBlock({ props, data, style }) {
  const doc = data.document || {};
  const isInvoice = data.docType === 'invoice';
  return (
    <div style={style} className="flex justify-between items-start">
      <h2 className="text-xl font-bold text-gray-400 uppercase tracking-wider">{props.titleLabel || (isInvoice ? 'TAX INVOICE' : 'ESTIMATE')}</h2>
      <div className="text-right text-xs text-gray-600 space-y-0.5">
        {props.showNumber && <p className="text-sm font-semibold text-gray-900">{isInvoice ? doc.invoice_number : doc.estimate_number || '#0000'}</p>}
        {props.showDate && <p>Date: {isInvoice ? doc.invoice_date : doc.estimate_date || 'N/A'}</p>}
        {props.showDueDate && isInvoice && doc.due_date && <p>Due: {doc.due_date}</p>}
        {props.showDueDate && isInvoice && doc.terms && <p>Terms: {doc.terms}</p>}
        {props.showDueDate && !isInvoice && doc.expiry_date && <p>Expires: {doc.expiry_date}</p>}
      </div>
    </div>
  );
}

function LineItemsBlock({ props, data, style }) {
  const items = data.lineItems || [];
  const currency = data.currency || 'AUD';

  // Group by category, respecting category sort order
  const grouped = {};
  const catOrder = [];
  for (const item of items) {
    const cat = item.category_name || '';
    if (!grouped[cat]) {
      grouped[cat] = [];
      catOrder.push(cat);
    }
    grouped[cat].push(item);
  }

  return (
    <div style={style}>
      <table className="w-full" style={{ fontSize: props.fontSize }}>
        <thead>
          <tr style={{ backgroundColor: props.headerBg, color: props.headerText }}>
            <th className="text-left py-1.5 px-2 font-medium">Description</th>
            <th className="text-right py-1.5 px-2 font-medium w-14">Qty</th>
            <th className="text-right py-1.5 px-2 font-medium w-20">Rate</th>
            {props.showTaxCol && <th className="text-right py-1.5 px-2 font-medium w-16">Tax</th>}
            <th className="text-right py-1.5 px-2 font-medium w-20">Amount</th>
          </tr>
        </thead>
        <tbody>
          {catOrder.map((cat) => (
            <React.Fragment key={cat || '__none'}>
              {/* Category header row */}
              {cat && (
                <tr>
                  <td colSpan={props.showTaxCol ? 5 : 4}
                    className="font-bold py-1.5 px-2 uppercase"
                    style={{ backgroundColor: props.categoryBg, color: props.categoryText, fontSize: props.fontSize }}
                  >
                    {cat}
                  </td>
                </tr>
              )}
              {/* Line item rows */}
              {grouped[cat].map((item, idx) => (
                <tr key={item.id || idx}
                  className="border-b border-gray-100"
                  style={props.alternateRows && idx % 2 === 1 ? { backgroundColor: '#f9fafb' } : {}}
                >
                  <td className="py-1 px-2 text-gray-700">{item.name}</td>
                  <td className="py-1 px-2 text-right text-gray-600 tabular-nums">{item.quantity}</td>
                  <td className="py-1 px-2 text-right text-gray-600 tabular-nums">{fmt(item.rate, currency)}</td>
                  {props.showTaxCol && <td className="py-1 px-2 text-right text-gray-500 tabular-nums">{fmt(item.tax_amount, currency)}</td>}
                  <td className="py-1 px-2 text-right font-medium tabular-nums">{fmt(item.total, currency)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={props.showTaxCol ? 5 : 4} className="py-4 text-center text-gray-400 text-xs">No line items</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TotalsBlock({ props, data, style }) {
  const doc = data.document || {};
  const currency = data.currency || 'AUD';
  const align = props.alignment === 'left' ? 'items-start' : 'items-end';

  return (
    <div style={style} className={`flex flex-col ${align}`}>
      <div className="w-48 space-y-1 text-xs">
        {props.showSubtotal && <Row label="SUBTOTAL" value={fmt(doc.subtotal, currency)} />}
        {props.showMarkup && (doc.markup_total || 0) > 0 && <Row label="MARKUP" value={`+${fmt(doc.markup_total, currency)}`} />}
        {props.showDiscount && (doc.discount_total || 0) > 0 && <Row label="DISCOUNT" value={`-${fmt(doc.discount_total, currency)}`} className="text-red-500" />}
        {props.showTax && (doc.tax_total || 0) > 0 && <Row label="GST 10%" value={fmt(doc.tax_total, currency)} />}
        {props.showRetainer && (doc.retainer_applied || 0) > 0 && <Row label="RETAINER" value={`-${fmt(doc.retainer_applied, currency)}`} className="text-green-600" />}
        <div className={`flex justify-between pt-1 border-t border-gray-300 ${props.highlightTotal ? 'font-bold text-sm' : 'font-medium'}`}>
          <span>TOTAL</span>
          <span className="tabular-nums">{fmt(doc.total, currency)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className = '' }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span className="text-gray-500">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function NotesBlock({ props, data, style }) {
  const doc = data.document || {};
  const notes = doc.notes || '';
  if (!notes && !props.showIfEmpty) return null;
  return (
    <div style={{ ...style, fontSize: props.fontSize }}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{props.sectionLabel || 'NOTES'}</p>
      <p className="text-gray-600 whitespace-pre-wrap">{notes || 'No notes.'}</p>
    </div>
  );
}

function DividerBlock({ props, style }) {
  return (
    <div style={style}>
      <hr style={{ borderTopWidth: props.weight, borderColor: props.color, width: `${props.widthPct}%` }} className="border-0 border-t" />
    </div>
  );
}

function SpacerBlock({ props }) {
  return <div style={{ height: props.height || 24 }} />;
}

function TextBlock({ props, style }) {
  return (
    <div style={{ ...style, fontSize: props.fontSize, color: props.color, textAlign: props.alignment, fontWeight: props.bold ? 'bold' : 'normal' }}>
      {props.content || ''}
    </div>
  );
}
