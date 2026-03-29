import React, { useState, useEffect } from 'react';

const CURRENCY_SYMBOLS = { AUD: '$', USD: 'US$', EUR: '€', GBP: '£', NZD: 'NZ$', CAD: 'CA$', SGD: 'S$' };

function formatCurrency(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StatementModal({ open, onClose, client, onCreated }) {
  // state variables
  const [settings, setSettings] = useState({});
  const [statementNumber, setStatementNumber] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [comments, setComments] = useState('');
  const [balance, setBalance] = useState(0);
  const [saveCopy, setSaveCopy] = useState(true);
  const [saveFolder, setSaveFolder] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  const currency = client?.currency || 'AUD';

  useEffect(() => {
    if (!open || !client) return;
    loadData();
  }, [open, client?.id]);

  async function loadData() {
    try {
      const stngs = await window.api.getSettings();
      setSettings(stngs);
      const prefix = stngs.statement_prefix || '';
      const nextNum = stngs.statement_next_number || '1';
      setStatementNumber(`${prefix}${nextNum}`);

      // Default period: 3 months ago to today
      const today = new Date().toISOString().slice(0, 10);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      setStatementDate(today);
      setPeriodEnd(today);
      setPeriodStart(threeMonthsAgo.toISOString().slice(0, 10));
      setComments('');
      setSaveCopy(true);
      setSaveFolder(stngs.statement_save_folder || '');
      setSendEmail(false);
      setOpenPreview(false);

      // Calculate balance
      const summary = await window.api.getClientSummary(client.id);
      setBalance(summary.balance || 0);
    } catch (err) { console.error(err); }
  }

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const stmtId = await window.api.createStatement({
        client_id: client.id,
        statement_date: statementDate,
        period_start: periodStart,
        period_end: periodEnd,
        balance,
        notes: comments || null,
      });

      try {
        const result = await window.api.generatePdf('statement', stmtId);
        if (result?.path) {
          if (saveCopy && saveFolder) await window.api.savePdfAs(result.path, result.filename, saveFolder);
          if (sendEmail) await window.api.sendEmail('statement', stmtId);
          if (openPreview) await window.api.openPdf(result.path);
        }
      } catch (pdfErr) {
        console.warn('PDF/delivery failed:', pdfErr);
      }

      onCreated();
      onClose();
    } catch (err) {
      console.error('Create statement failed:', err);
    }
    setCreating(false);
  }

  async function handleChooseFolder() {
    const folder = await window.api.chooseSaveFolder();
    if (folder) {
      setSaveFolder(folder);
      await window.api.saveSetting('statement_save_folder', folder);
    }
  }

  if (!open) return null;

  const clientName = client?.is_company ? client.company : `${client?.first_name || ''} ${client?.last_name || ''}`.trim();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Statement for "{clientName}"</h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Statement Number & Balance */}
          <div className="flex justify-between items-start">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Statement Number</label>
              <input value={statementNumber} onChange={(e) => setStatementNumber(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-40 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">Balance</span>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(balance, currency)}</p>
            </div>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Statement Date</label>
            <input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Period From</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Period To</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Comments</label>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Optional notes..." />
          </div>

          {/* Delivery Options */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Delivery Options</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={saveCopy} onChange={(e) => setSaveCopy(e.target.checked)} className="rounded" />
                <span>Save a copy</span>
                {saveCopy && (
                  <button onClick={handleChooseFolder} className="ml-auto text-xs text-brand-600 hover:text-brand-700">
                    {saveFolder ? saveFolder.split('/').pop() : 'Choose...'}
                  </button>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="rounded" />
                <span>Send an Email</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={openPreview} onChange={(e) => setOpenPreview(e.target.checked)} className="rounded" />
                <span>Open PDF in Preview</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleCreate} disabled={creating} className="px-5 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md font-medium disabled:opacity-50">
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
