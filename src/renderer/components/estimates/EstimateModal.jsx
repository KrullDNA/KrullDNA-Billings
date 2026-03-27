import React, { useState, useEffect } from 'react';

const CURRENCY_SYMBOLS = { AUD: '$', USD: '$', EUR: '\u20ac', GBP: '\u00a3', NZD: '$', CAD: '$', SGD: '$' };

function formatCurrency(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function EstimateModal({ open, onClose, client, project, onCreated }) {
  const [activeTab, setActiveTab] = useState('estimate');
  const [unbilledItems, setUnbilledItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [settings, setSettings] = useState({});

  const [estimateNumber, setEstimateNumber] = useState('');
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [comments, setComments] = useState('');

  const [saveCopy, setSaveCopy] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [printEstimate, setPrintEstimate] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadData();
    setActiveTab('estimate');
  }, [open]);

  useEffect(() => {
    if (estimateDate) setExpiryDate(addDays(estimateDate, 30));
  }, [estimateDate]);

  async function loadData() {
    try {
      const [items, tmpls, stngs] = await Promise.all([
        window.api.getUnbilledLineItems(project.id),
        window.api.getTemplates('estimate'),
        window.api.getSettings(),
      ]);
      setUnbilledItems(items);
      setSelectedIds(new Set(items.map((i) => i.id)));
      setTemplates(tmpls);
      setSelectedTemplateId(tmpls.find((t) => t.is_default)?.id || tmpls[0]?.id || null);
      setSettings(stngs);

      const prefix = stngs.estimate_prefix || 'EST-';
      const nextNum = stngs.estimate_next_number || '1001';
      setEstimateNumber(`${prefix}${nextNum}`);
      setEstimateDate(new Date().toISOString().slice(0, 10));
      setComments('');
    } catch (err) {
      console.error('Failed to load estimate data:', err);
    }
  }

  function toggleItem(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedItems = unbilledItems.filter((i) => selectedIds.has(i.id));
  const subtotal = selectedItems.reduce((s, i) => s + (i.subtotal || 0), 0);
  const taxTotal = selectedItems.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const total = subtotal + taxTotal;
  const currency = client?.currency || 'AUD';

  async function handleCreate() {
    if (selectedIds.size === 0) return;
    try {
      await window.api.createEstimate({
        client_id: client.id,
        project_id: project.id,
        currency,
        estimate_date: estimateDate,
        expiry_date: expiryDate || null,
        template_id: selectedTemplateId,
        notes: comments || null,
      }, Array.from(selectedIds));

      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create estimate:', err);
    }
  }

  if (!open) return null;

  const clientName = client.is_company ? client.company : `${client.first_name} ${client.last_name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Estimate for {clientName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Template Picker */}
        {templates.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2">Template</p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {templates.map((t) => (
                <button key={t.id} onClick={() => setSelectedTemplateId(t.id)} className={`flex-shrink-0 w-20 text-center ${selectedTemplateId === t.id ? '' : 'opacity-60'}`}>
                  <div className={`w-20 h-28 bg-white border-2 rounded shadow-sm flex items-center justify-center text-xs text-gray-400 ${selectedTemplateId === t.id ? 'border-brand-500' : 'border-gray-200'}`}>PDF</div>
                  <p className="text-[10px] text-gray-600 mt-1 truncate">{t.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {['estimate', 'slips', 'preview'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${activeTab === tab ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'slips' ? 'Slips' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'estimate' && (
            <div className="grid grid-cols-[1fr_220px] gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estimate Number</label>
                  <input value={estimateNumber} onChange={(e) => setEstimateNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Estimate Date</label>
                    <input type="date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Expiry Date</label>
                    <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Delivery Options</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={saveCopy} onChange={(e) => setSaveCopy(e.target.checked)} className="rounded border-gray-300 text-brand-600" />
                      Save a copy
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="rounded border-gray-300 text-brand-600" />
                      Send an Email
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={printEstimate} onChange={(e) => setPrintEstimate(e.target.checked)} className="rounded border-gray-300 text-brand-600" />
                      Print
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Comments</label>
                  <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 h-fit space-y-2 border border-gray-100">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotal, currency)}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>Taxes</span><span className="tabular-nums">{formatCurrency(taxTotal, currency)}</span></div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span className="tabular-nums">{formatCurrency(total, currency)}</span></div>
              </div>
            </div>
          )}

          {activeTab === 'slips' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">Select line items to include on this estimate.</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[32px_60px_1fr_60px_80px_80px] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                  <span /><span>Kind</span><span>Name</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Total</span>
                </div>
                {unbilledItems.map((item) => (
                  <label key={item.id} className="grid grid-cols-[32px_60px_1fr_60px_80px_80px] gap-2 px-4 py-2 text-sm border-b border-gray-50 hover:bg-gray-50 cursor-pointer items-center">
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleItem(item.id)} className="rounded border-gray-300 text-brand-600" />
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full text-center ${item.kind === 'hourly' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {item.kind === 'hourly' ? 'Hourly' : 'Fixed'}
                    </span>
                    <span className="truncate">{item.name}</span>
                    <span className="text-right tabular-nums text-gray-600">{item.quantity}</span>
                    <span className="text-right tabular-nums text-gray-600">{formatCurrency(item.rate, currency)}</span>
                    <span className="text-right tabular-nums font-medium">{formatCurrency(item.total, currency)}</span>
                  </label>
                ))}
                {unbilledItems.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">No unbilled line items.</div>}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="bg-white border border-gray-200 rounded shadow-sm p-8 max-w-[595px] mx-auto text-sm">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{settings.business_name || 'Krull D+A'}</h1>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold text-gray-400 uppercase">Estimate</h2>
                  <p className="text-sm font-medium">{estimateNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Prepared For</p>
                  <p className="font-medium">{clientName}</p>
                </div>
                <div className="text-right text-xs text-gray-500 space-y-1">
                  <p>Date: <span className="text-gray-800">{estimateDate}</span></p>
                  <p>Expires: <span className="text-gray-800">{expiryDate}</span></p>
                </div>
              </div>
              <table className="w-full text-xs mb-6">
                <thead><tr className="border-b border-gray-300"><th className="text-left py-2 font-medium text-gray-500">Description</th><th className="text-right py-2 font-medium text-gray-500 w-16">Qty</th><th className="text-right py-2 font-medium text-gray-500 w-20">Rate</th><th className="text-right py-2 font-medium text-gray-500 w-20">Amount</th></tr></thead>
                <tbody>
                  {selectedItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-700">{item.name}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-600">{item.quantity}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-600">{formatCurrency(item.rate, currency)}</td>
                      <td className="py-1.5 text-right tabular-nums font-medium">{formatCurrency(item.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-48 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">SUBTOTAL</span><span className="tabular-nums">{formatCurrency(subtotal, currency)}</span></div>
                  {taxTotal > 0 && <div className="flex justify-between"><span className="text-gray-500">TAX</span><span className="tabular-nums">{formatCurrency(taxTotal, currency)}</span></div>}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300"><span>TOTAL</span><span className="tabular-nums">{formatCurrency(total, currency)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={handleCreate} disabled={selectedIds.size === 0} className={`px-4 py-2 text-sm text-white rounded-md ${selectedIds.size === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700'}`}>
            Create Estimate
          </button>
        </div>
      </div>
    </div>
  );
}
