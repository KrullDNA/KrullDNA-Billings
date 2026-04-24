import React, { useState, useEffect, useCallback } from 'react';

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CURRENCY_SYMBOLS = { AUD: '$', USD: 'US$', EUR: '\u20ac', GBP: '\u00a3', NZD: 'NZ$', CAD: 'CA$', SGD: 'S$' };

function formatCurrency(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const emptyForm = {
  name: '',
  category_id: null,
  kind: 'fixed',
  billable: 1,
  duration_seconds: 0,
  rate: 0,
  quantity: 1,
  markup_pct: 0,
  discount_pct: 0,
  tax_id: null,
  notes: '',
  date: localDate(),
  status: 'unbilled',
};

export default function LineItemForm({ open, onClose, lineItem, projectId, currency, onSaved, defaultStatus }) {
  const [form, setForm] = useState({ ...emptyForm });
  const [categories, setCategories] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [titleEditing, setTitleEditing] = useState(false);
  const [startedChecked, setStartedChecked] = useState(false);
  const [completedChecked, setCompletedChecked] = useState(false);
  const [startedDate, setStartedDate] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const isEditing = Boolean(lineItem?.id);

  useEffect(() => {
    if (!open) return;
    loadDropdowns();
    if (lineItem) {
      setForm({
        name: lineItem.name || '',
        category_id: lineItem.category_id || null,
        kind: lineItem.kind || 'fixed',
        billable: lineItem.billable !== undefined ? lineItem.billable : 1,
        duration_seconds: lineItem.duration_seconds || 0,
        rate: lineItem.rate || 0,
        quantity: lineItem.quantity || 1,
        markup_pct: lineItem.markup_pct || 0,
        discount_pct: lineItem.discount_pct || 0,
        tax_id: lineItem.tax_id || null,
        notes: lineItem.notes || '',
        date: lineItem.date || localDate(),
        status: lineItem.status || 'unbilled',
      });
      setStartedChecked(false);
      setCompletedChecked(false);
    } else {
      setForm({ ...emptyForm, date: localDate(), status: defaultStatus || 'unbilled' });
      setStartedChecked(false);
      setCompletedChecked(false);
      setStartedDate(localDate());
      setCompletedDate('');
    }
    setActiveTab('details');
  }, [open, lineItem]);

  async function loadDropdowns() {
    try {
      const [cats, txs] = await Promise.all([
        window.api.getCategories(),
        window.api.getTaxes(),
      ]);
      setCategories(cats);
      setTaxes(txs);
      // Set default tax if creating new
      if (!lineItem) {
        const defaultTax = txs.find((t) => t.is_default);
        if (defaultTax) setForm((prev) => ({ ...prev, tax_id: defaultTax.id }));
      }
    } catch (err) {
      console.error('Failed to load dropdowns:', err);
    }
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Duration helpers ──
  function durationToHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function hmsToDuration(hms) {
    const parts = hms.split(':').map(Number);
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    if (parts.length === 2) return (parts[0] * 3600) + (parts[1] * 60);
    return 0;
  }

  // ── Live calculation ──
  const rate = parseFloat(form.rate) || 0;
  const quantity = parseFloat(form.quantity) || 1;
  const markupPct = parseFloat(form.markup_pct) || 0;
  const discountPct = parseFloat(form.discount_pct) || 0;
  const selectedTax = taxes.find((t) => t.id === form.tax_id);
  const taxRate = selectedTax ? selectedTax.rate : 0;

  const subtotal = rate * quantity;
  const markupAmount = subtotal * (markupPct / 100);
  const discountAmount = subtotal * (discountPct / 100);
  const afterAdjustments = subtotal + markupAmount - discountAmount;
  const taxAmount = afterAdjustments * taxRate;
  const total = afterAdjustments + taxAmount;

  const sym = CURRENCY_SYMBOLS[currency] || '$';

  async function handleSubmit() {
    if (!form.name.trim()) return;

    const data = {
      project_id: projectId,
      name: form.name.trim(),
      category_id: form.category_id || null,
      kind: form.kind,
      billable: form.billable,
      duration_seconds: form.duration_seconds,
      rate,
      quantity,
      markup_pct: markupPct,
      discount_pct: discountPct,
      tax_id: form.tax_id || null,
      subtotal,
      markup_amount: markupAmount,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total,
      notes: form.notes || null,
      date: form.date || null,
      status: form.status,
    };

    try {
      if (isEditing) {
        const { project_id, ...updateData } = data;
        await window.api.updateLineItem(lineItem.id, updateData);
      } else {
        await window.api.createLineItem(data);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save line item:', err);
    }
  }

  async function handleDelete() {
    if (!isEditing) return;
    try {
      if (lineItem.status === 'working') {
        await window.api.updateLineItem(lineItem.id, { status: 'unbilled' });
      } else {
        await window.api.deleteLineItem(lineItem.id);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to delete line item:', err);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Title Bar — editable name */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          {titleEditing ? (
            <input
              autoFocus
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              onBlur={() => setTitleEditing(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setTitleEditing(false); }}
              className="text-base font-semibold text-gray-900 bg-white border border-brand-300 rounded px-2 py-0.5 flex-1 mr-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          ) : (
            <h2
              onClick={() => setTitleEditing(true)}
              className="text-base font-semibold text-gray-900 cursor-text flex-1 truncate hover:text-brand-700"
              title="Click to edit name"
            >
              {form.name || 'New Line Item'}
            </h2>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'details'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'comments'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Comments
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'details' ? (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="Line item description"
                />
              </div>

              {/* Category + Kind row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select
                    value={form.category_id || ''}
                    onChange={(e) => update('category_id', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kind</label>
                  <select
                    value={form.kind}
                    onChange={(e) => update('kind', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                    <option value="mileage">Mileage</option>
                  </select>
                </div>
              </div>

              {/* Billable */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Billable</label>
                <select
                  value={form.billable}
                  onChange={(e) => update('billable', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value={1}>Billable</option>
                  <option value={0}>Non-Billable</option>
                </select>
              </div>

              {/* Duration (for hourly items) */}
              {form.kind === 'hourly' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={durationToHMS(form.duration_seconds)}
                      onChange={(e) => update('duration_seconds', hmsToDuration(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="HH:MM:SS"
                    />
                    <button className="px-3 py-2 text-xs text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50">
                      Log...
                    </button>
                  </div>
                </div>
              )}

              {/* Started / Completed */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                    <input
                      type="checkbox"
                      checked={startedChecked}
                      onChange={(e) => {
                        setStartedChecked(e.target.checked);
                        if (e.target.checked && !startedDate) setStartedDate(localDate());
                      }}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Started
                  </label>
                  {startedChecked && (
                    <input
                      type="date"
                      value={startedDate}
                      onChange={(e) => setStartedDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                    <input
                      type="checkbox"
                      checked={completedChecked}
                      onChange={(e) => {
                        setCompletedChecked(e.target.checked);
                        if (e.target.checked && !completedDate) setCompletedDate(localDate());
                      }}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Completed
                  </label>
                  {completedChecked && (
                    <input
                      type="date"
                      value={completedDate}
                      onChange={(e) => setCompletedDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  )}
                </div>
              </div>

              {/* Rate + Quantity + Due */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.rate || ''}
                      onChange={(e) => update('rate', e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.quantity || ''}
                    onChange={(e) => update('quantity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Due</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={form.date || ''}
                      onChange={(e) => update('date', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button className="p-2 text-gray-400 hover:text-gray-600" title="Date calculation">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008H15.75v-.008zm0 2.25h.008v.008H15.75V13.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Markup + Discount row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Markup %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.markup_pct || ''}
                    onChange={(e) => update('markup_pct', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Discount %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.discount_pct || ''}
                    onChange={(e) => update('discount_pct', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Tax dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tax</label>
                <select
                  value={form.tax_id || ''}
                  onChange={(e) => update('tax_id', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">No Tax</option>
                  {taxes.map((tax) => (
                    <option key={tax.id} value={tax.id}>{tax.name} ({(tax.rate * 100).toFixed(0)}%)</option>
                  ))}
                </select>
              </div>

              {/* ── Calculated Section ── */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-100">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-medium">{formatCurrency(subtotal, currency)}</span>
                </div>
                {markupPct > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Markup ({markupPct}%)</span>
                    <span className="tabular-nums">+{formatCurrency(markupAmount, currency)}</span>
                  </div>
                )}
                {discountPct > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Discount ({discountPct}%)</span>
                    <span className="tabular-nums">-{formatCurrency(discountAmount, currency)}</span>
                  </div>
                )}
                {selectedTax && selectedTax.rate > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{selectedTax.name}</span>
                    <span className="tabular-nums">{formatCurrency(taxAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(total, currency)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Comments Tab */
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes / Comments</label>
              <textarea
                value={form.notes || ''}
                onChange={(e) => update('notes', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                placeholder="Add notes or comments about this line item..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
