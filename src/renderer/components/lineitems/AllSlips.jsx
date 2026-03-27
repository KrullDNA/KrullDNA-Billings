import React, { useState, useEffect } from 'react';
import LineItemForm from './LineItemForm';

const CURRENCY_SYMBOLS = { AUD: '$', USD: 'US$', EUR: '\u20ac', GBP: '\u00a3', NZD: 'NZ$', CAD: 'CA$', SGD: 'S$' };
function fmt(amount, c = 'AUD') { return `${CURRENCY_SYMBOLS[c] || '$'}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function AllSlips() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    try { setItems(await window.api.getAllLineItems(filter === 'all' ? undefined : filter)); } catch (err) { console.error(err); }
  }

  const filtered = search ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())) : items;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">All Line Items</h2>
        <div className="flex items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="px-3 py-1.5 border border-gray-300 rounded-md text-xs w-48 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          {['all', 'unbilled', 'invoiced'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-md ${filter === f ? 'bg-brand-100 text-brand-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-gray-50 grid grid-cols-[60px_1fr_120px_120px_60px_80px_80px] gap-2 px-6 py-2 text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
          <span>Kind</span><span>Name</span><span>Project</span><span>Client</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Total</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No line items found.</div>
        ) : filtered.map((item) => (
          <div key={item.id} onClick={() => { setEditItem(item); setFormOpen(true); }} className="grid grid-cols-[60px_1fr_120px_120px_60px_80px_80px] gap-2 px-6 py-2 text-sm border-b border-gray-50 hover:bg-gray-50 cursor-pointer items-center">
            <span><span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${item.kind === 'hourly' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{item.kind === 'hourly' ? 'Hourly' : 'Fixed'}</span></span>
            <span className="flex items-center gap-2 truncate">
              {item.status === 'invoiced' ? <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" /> : <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />}
              <span className="truncate">{item.name}</span>
            </span>
            <span className="text-xs text-gray-500 truncate">{item.project_name || '-'}</span>
            <span className="text-xs text-gray-500 truncate">{item.client_is_company ? item.client_company : [item.client_first, item.client_last].filter(Boolean).join(' ') || '-'}</span>
            <span className="text-right tabular-nums text-gray-600">{item.quantity}</span>
            <span className="text-right tabular-nums text-gray-600">{fmt(item.rate)}</span>
            <span className="text-right tabular-nums font-medium">{fmt(item.total)}</span>
          </div>
        ))}
      </div>

      <div className="h-8 bg-gray-50 border-t border-gray-200 flex items-center px-6 text-xs text-gray-500">
        {filtered.length} item{filtered.length !== 1 ? 's' : ''}
      </div>

      <LineItemForm open={formOpen} onClose={() => setFormOpen(false)} lineItem={editItem} projectId={editItem?.project_id} currency="AUD" onSaved={load} />
    </div>
  );
}
