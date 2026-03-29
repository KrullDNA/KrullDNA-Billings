import React, { useState, useEffect } from 'react';

const FILENAME_PLACEHOLDERS = ['%clientName%', '%projectName%', '%invNum%', '%estNum%', '%stmtNum%'];

export default function NumberingSettings() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setSettings(await window.api.getSettings()); } catch (err) { console.error(err); }
  }

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    try {
      await window.api.saveSettings({
        invoice_prefix: settings.invoice_prefix || '',
        invoice_next_number: settings.invoice_next_number || '1001',
        estimate_prefix: settings.estimate_prefix || '',
        estimate_next_number: settings.estimate_next_number || '1001',
        statement_prefix: settings.statement_prefix || '',
        statement_next_number: settings.statement_next_number || '1',
        invoice_filename_pattern: settings.invoice_filename_pattern || '%clientName% %projectName% Invoice %invNum%',
        estimate_filename_pattern: settings.estimate_filename_pattern || '%clientName% %projectName% Estimate %estNum%',
        statement_filename_pattern: settings.statement_filename_pattern || '%clientName% Statement %stmtNum%',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  }

  async function resetInvoiceNumber() {
    update('invoice_next_number', '1001');
  }

  async function resetEstimateNumber() {
    update('estimate_next_number', '1001');
  }

  const invoicePreview = `${settings.invoice_prefix || ''}${settings.invoice_next_number || '1001'}`;
  const estimatePreview = `${settings.estimate_prefix || ''}${settings.estimate_next_number || '1001'}`;

  const statementPreview = `${settings.statement_prefix || ''}${settings.statement_next_number || '1'}`;

  const invFilenamePreview = (settings.invoice_filename_pattern || '%clientName% %projectName% Invoice %invNum%')
    .replace('%clientName%', 'AcmeCo').replace('%projectName%', 'Website').replace('%invNum%', invoicePreview);
  const estFilenamePreview = (settings.estimate_filename_pattern || '%clientName% %projectName% Estimate %estNum%')
    .replace('%clientName%', 'AcmeCo').replace('%projectName%', 'Website').replace('%estNum%', estimatePreview);
  const stmtFilenamePreview = (settings.statement_filename_pattern || '%clientName% Statement %stmtNum%')
    .replace('%clientName%', 'AcmeCo').replace('%projectName%', '').replace('%stmtNum%', statementPreview).replace(/\s+/g, ' ').trim();

  return (
    <div className="max-w-lg space-y-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Document Numbering</h3>

      {/* Invoices */}
      <fieldset className="border border-gray-200 rounded-md p-4 space-y-3">
        <legend className="text-xs font-semibold text-gray-500 px-1 uppercase">Invoices</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Prefix</label>
            <input value={settings.invoice_prefix || ''} onChange={(e) => update('invoice_prefix', e.target.value)} placeholder="e.g. INV-" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Next Number</label>
            <input type="number" value={settings.invoice_next_number || ''} onChange={(e) => update('invoice_next_number', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Preview: <span className="font-mono text-gray-700">{invoicePreview}</span></span>
          <button onClick={resetInvoiceNumber} className="text-[10px] text-red-500 hover:text-red-600">Reset to 1001</button>
        </div>
      </fieldset>

      {/* Estimates */}
      <fieldset className="border border-gray-200 rounded-md p-4 space-y-3">
        <legend className="text-xs font-semibold text-gray-500 px-1 uppercase">Estimates</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Prefix</label>
            <input value={settings.estimate_prefix || ''} onChange={(e) => update('estimate_prefix', e.target.value)} placeholder="e.g. EST-" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Next Number</label>
            <input type="number" value={settings.estimate_next_number || ''} onChange={(e) => update('estimate_next_number', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Preview: <span className="font-mono text-gray-700">{estimatePreview}</span></span>
          <button onClick={resetEstimateNumber} className="text-[10px] text-red-500 hover:text-red-600">Reset to 1001</button>
        </div>
      </fieldset>

      {/* Statements */}
      <fieldset className="border border-gray-200 rounded-md p-4 space-y-3">
        <legend className="text-xs font-semibold text-gray-500 px-1 uppercase">Statements</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Prefix</label>
            <input value={settings.statement_prefix || ''} onChange={(e) => update('statement_prefix', e.target.value)} placeholder="e.g. STMT-" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Next Number</label>
            <input type="number" value={settings.statement_next_number || ''} onChange={(e) => update('statement_next_number', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
        </div>
        <span className="text-xs text-gray-500">Preview: <span className="font-mono text-gray-700">{`${settings.statement_prefix || ''}${settings.statement_next_number || '1'}`}</span></span>
      </fieldset>

      {/* PDF Filename Patterns */}
      <fieldset className="border border-gray-200 rounded-md p-4 space-y-3">
        <legend className="text-xs font-semibold text-gray-500 px-1 uppercase">PDF Filenames</legend>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Filename</label>
          <input value={settings.invoice_filename_pattern || '%clientName% %projectName% Invoice %invNum%'} onChange={(e) => update('invoice_filename_pattern', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <p className="text-[10px] text-gray-400 mt-1">Preview: <span className="font-mono text-gray-600">{invFilenamePreview}.pdf</span></p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Estimate Filename</label>
          <input value={settings.estimate_filename_pattern || '%clientName% %projectName% Estimate %estNum%'} onChange={(e) => update('estimate_filename_pattern', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <p className="text-[10px] text-gray-400 mt-1">Preview: <span className="font-mono text-gray-600">{estFilenamePreview}.pdf</span></p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Statement Filename</label>
          <input value={settings.statement_filename_pattern || '%clientName% Statement %stmtNum%'} onChange={(e) => update('statement_filename_pattern', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <p className="text-[10px] text-gray-400 mt-1">Preview: <span className="font-mono text-gray-600">{stmtFilenamePreview}.pdf</span></p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-[10px] text-gray-500">Placeholders: {FILENAME_PLACEHOLDERS.map((p) => <code key={p} className="bg-gray-200 px-1 py-0.5 rounded mx-0.5">{p}</code>)}</p>
        </div>
      </fieldset>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button onClick={save} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md">{saved ? 'Saved!' : 'Save'}</button>
      </div>
    </div>
  );
}
