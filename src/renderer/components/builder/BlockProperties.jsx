import React from 'react';

export default function BlockProperties({ block, onChange }) {
  if (!block) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400 p-4">
        Select a block to edit its properties
      </div>
    );
  }

  const { type, props } = block;

  function update(key, value) {
    onChange({ ...block, props: { ...props, [key]: value } });
  }

  return (
    <div className="p-4 space-y-4 text-xs">
      <h3 className="font-semibold text-gray-700 text-sm">{typeLabel(type)}</h3>

      {/* Common: Padding */}
      <fieldset className="border border-gray-200 rounded p-2 space-y-2">
        <legend className="text-[10px] text-gray-500 px-1">Spacing</legend>
        <NumField label="Padding Top" value={props.paddingTop} onChange={(v) => update('paddingTop', v)} />
        <NumField label="Padding Bottom" value={props.paddingBottom} onChange={(v) => update('paddingBottom', v)} />
      </fieldset>

      {/* Per-type properties */}
      {type === 'header_block' && (
        <>
          <Toggle label="Show Logo" checked={props.showLogo} onChange={(v) => update('showLogo', v)} />
          <Toggle label="Show Business Name" checked={props.showBusinessName} onChange={(v) => update('showBusinessName', v)} />
          <Toggle label="Show ABN" checked={props.showAbn} onChange={(v) => update('showAbn', v)} />
          <Toggle label="Show Contact Details" checked={props.showContact} onChange={(v) => update('showContact', v)} />
          <ColorField label="Background" value={props.bgColor} onChange={(v) => update('bgColor', v)} />
          <ColorField label="Text Colour" value={props.textColor} onChange={(v) => update('textColor', v)} />
          <SelectField label="Logo Alignment" value={props.logoAlign} options={['left', 'right']} onChange={(v) => update('logoAlign', v)} />
        </>
      )}

      {type === 'client_block' && (
        <>
          <TextField label="Section Label" value={props.sectionLabel} onChange={(v) => update('sectionLabel', v)} />
          <Toggle label="Show Phone" checked={props.showPhone} onChange={(v) => update('showPhone', v)} />
          <Toggle label="Show Email" checked={props.showEmail} onChange={(v) => update('showEmail', v)} />
          <NumField label="Font Size" value={props.fontSize} onChange={(v) => update('fontSize', v)} />
        </>
      )}

      {type === 'doc_title_block' && (
        <>
          <TextField label="Title Label" value={props.titleLabel} onChange={(v) => update('titleLabel', v)} />
          <Toggle label="Show Number" checked={props.showNumber} onChange={(v) => update('showNumber', v)} />
          <Toggle label="Show Date" checked={props.showDate} onChange={(v) => update('showDate', v)} />
          <Toggle label="Show Due/Expiry Date" checked={props.showDueDate} onChange={(v) => update('showDueDate', v)} />
        </>
      )}

      {type === 'line_items_block' && (
        <>
          <ColorField label="Header BG" value={props.headerBg} onChange={(v) => update('headerBg', v)} />
          <ColorField label="Header Text" value={props.headerText} onChange={(v) => update('headerText', v)} />
          <ColorField label="Category Header BG" value={props.categoryBg} onChange={(v) => update('categoryBg', v)} />
          <ColorField label="Category Header Text" value={props.categoryText} onChange={(v) => update('categoryText', v)} />
          <Toggle label="Show Tax Column" checked={props.showTaxCol} onChange={(v) => update('showTaxCol', v)} />
          <Toggle label="Alternate Row Shading" checked={props.alternateRows} onChange={(v) => update('alternateRows', v)} />
          <NumField label="Font Size" value={props.fontSize} onChange={(v) => update('fontSize', v)} />
        </>
      )}

      {type === 'totals_block' && (
        <>
          <SelectField label="Alignment" value={props.alignment} options={['left', 'right']} onChange={(v) => update('alignment', v)} />
          <Toggle label="Show Subtotal" checked={props.showSubtotal} onChange={(v) => update('showSubtotal', v)} />
          <Toggle label="Show Markup" checked={props.showMarkup} onChange={(v) => update('showMarkup', v)} />
          <Toggle label="Show Discount" checked={props.showDiscount} onChange={(v) => update('showDiscount', v)} />
          <Toggle label="Show Tax" checked={props.showTax} onChange={(v) => update('showTax', v)} />
          <Toggle label="Show Retainer" checked={props.showRetainer} onChange={(v) => update('showRetainer', v)} />
          <Toggle label="Highlight Total Row" checked={props.highlightTotal} onChange={(v) => update('highlightTotal', v)} />
        </>
      )}

      {type === 'notes_block' && (
        <>
          <TextField label="Section Label" value={props.sectionLabel} onChange={(v) => update('sectionLabel', v)} />
          <NumField label="Font Size" value={props.fontSize} onChange={(v) => update('fontSize', v)} />
          <Toggle label="Show if Empty" checked={props.showIfEmpty} onChange={(v) => update('showIfEmpty', v)} />
        </>
      )}

      {type === 'divider_block' && (
        <>
          <NumField label="Line Weight" value={props.weight} onChange={(v) => update('weight', v)} />
          <ColorField label="Line Colour" value={props.color} onChange={(v) => update('color', v)} />
          <NumField label="Width %" value={props.widthPct} onChange={(v) => update('widthPct', v)} />
        </>
      )}

      {type === 'spacer_block' && (
        <NumField label="Height (px)" value={props.height} onChange={(v) => update('height', v)} />
      )}

      {type === 'text_block' && (
        <>
          <div>
            <label className="block text-[10px] text-gray-500 mb-0.5">Content</label>
            <textarea value={props.content} onChange={(e) => update('content', e.target.value)} rows={3} className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
          </div>
          <NumField label="Font Size" value={props.fontSize} onChange={(v) => update('fontSize', v)} />
          <Toggle label="Bold" checked={props.bold} onChange={(v) => update('bold', v)} />
          <ColorField label="Colour" value={props.color} onChange={(v) => update('color', v)} />
          <SelectField label="Alignment" value={props.alignment} options={['left', 'center', 'right']} onChange={(v) => update('alignment', v)} />
        </>
      )}
    </div>
  );
}

function typeLabel(type) {
  return type.replace(/_block$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + ' Block';
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
    </label>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <input type="number" value={value || 0} onChange={(e) => onChange(parseInt(e.target.value) || 0)} className="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-brand-500" />
    </div>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 mb-0.5">{label}</label>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="w-6 h-6 rounded border border-gray-300 cursor-pointer" />
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-16 px-1 py-0.5 border border-gray-300 rounded text-[10px] focus:outline-none" />
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500">
        {options.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    </div>
  );
}
