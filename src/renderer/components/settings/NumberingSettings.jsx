import React, { useState, useEffect } from 'react';

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

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button onClick={save} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md">{saved ? 'Saved!' : 'Save'}</button>
      </div>
    </div>
  );
}
