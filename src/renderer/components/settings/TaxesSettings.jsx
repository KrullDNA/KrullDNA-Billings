import React, { useState, useEffect } from 'react';

export default function TaxesSettings() {
  const [taxes, setTaxes] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try { setTaxes(await window.api.getTaxes()); } catch (err) { console.error(err); }
  }

  async function handleAdd() {
    const name = newName.trim();
    const rate = parseFloat(newRate);
    if (!name || isNaN(rate)) { setAdding(false); return; }
    setError('');
    try {
      await window.api.saveTax({ name, rate: rate / 100 });
      setNewName('');
      setNewRate('');
      setAdding(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(tax) {
    setError('');
    try {
      await window.api.deleteTax(tax.id);
      load();
    } catch (err) { setError('Cannot delete: tax rate may be in use.'); }
  }

  async function handleSetDefault(tax) {
    try {
      await window.api.setDefaultTax(tax.id);
      load();
    } catch (err) { console.error(err); }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Tax Rates</h3>
          <p className="text-xs text-gray-500 mt-0.5">Manage tax rates used on line items.</p>
        </div>
        <button onClick={() => setAdding(true)} className="px-3 py-1.5 text-xs text-brand-600 border border-brand-200 rounded hover:bg-brand-50">+ Add Tax</button>
      </div>

      {error && <div className="mb-3 px-3 py-2 text-xs text-red-600 bg-red-50 rounded-md border border-red-100">{error}</div>}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
          <span>Name</span><span className="text-right">Rate</span><span>Default</span><span />
        </div>
        {taxes.map((tax) => (
          <div key={tax.id} className="grid grid-cols-[1fr_80px_80px_80px] gap-2 px-4 py-2 text-sm border-b border-gray-50 hover:bg-gray-50 items-center">
            <span className="font-medium">{tax.name}</span>
            <span className="text-right tabular-nums text-gray-600">{(tax.rate * 100).toFixed(0)}%</span>
            <span>
              {tax.is_default ? (
                <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Default</span>
              ) : (
                <button onClick={() => handleSetDefault(tax)} className="text-[10px] text-gray-400 hover:text-brand-600">Set default</button>
              )}
            </span>
            <button onClick={() => handleDelete(tax)} className="text-[10px] text-red-400 hover:text-red-600 text-right">Delete</button>
          </div>
        ))}
        {adding && (
          <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 bg-brand-50 border-t border-gray-200 items-center">
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tax name" className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }} />
            <div className="relative">
              <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="%" className="w-full px-2 py-1 pr-6 text-sm border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-brand-500" onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
            </div>
            <button onClick={handleAdd} className="px-2 py-1 text-xs text-brand-600 hover:bg-brand-100 rounded">Add</button>
          </div>
        )}
        {taxes.length === 0 && !adding && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">No tax rates defined.</div>
        )}
      </div>
    </div>
  );
}
