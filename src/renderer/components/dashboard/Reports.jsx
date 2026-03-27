import React, { useState } from 'react';

function fmt(a) { return `$${(a || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function cn(r) { return r.is_company ? r.company : [r.first_name, r.last_name].filter(Boolean).join(' '); }

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';

export default function Reports() {
  const [tab, setTab] = useState('income');
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [incomeData, setIncomeData] = useState(null);
  const [taxData, setTaxData] = useState(null);
  const [outstandingData, setOutstandingData] = useState(null);

  async function loadIncome() {
    try { setIncomeData(await window.api.getIncomeByClient(startDate, endDate)); } catch (err) { console.error(err); }
  }

  async function loadTax() {
    try { setTaxData(await window.api.getTaxCollected(startDate, endDate)); } catch (err) { console.error(err); }
  }

  async function loadOutstanding() {
    try {
      const stats = await window.api.getDashboardStats();
      setOutstandingData(stats.overdueInvoices || []);
    } catch (err) { console.error(err); }
  }

  function exportCsv(headers, rows, filename) {
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Reports</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-xs" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-xs" />
        </div>
      </div>

      <div className="flex border-b border-gray-200 px-6">
        {[{ id: 'income', label: 'Income by Client' }, { id: 'tax', label: 'Tax Collected' }, { id: 'outstanding', label: 'Outstanding' }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'income' && <IncomeReport data={incomeData} onLoad={loadIncome} onExport={exportCsv} />}
        {tab === 'tax' && <TaxReport data={taxData} onLoad={loadTax} onExport={exportCsv} />}
        {tab === 'outstanding' && <OutstandingReport data={outstandingData} onLoad={loadOutstanding} onExport={exportCsv} />}
      </div>
    </div>
  );
}

function IncomeReport({ data, onLoad, onExport }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onLoad} className="px-3 py-1.5 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded">Generate Report</button>
        {data && <button onClick={() => onExport(['Client', 'Invoices', 'Total Paid'], data.map((r) => [cn(r), r.invoice_count, r.total_paid.toFixed(2)]), 'income-by-client.csv')} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">Export CSV</button>}
      </div>
      {data ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_100px] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase border-b border-gray-100"><span>Client</span><span className="text-right">Invoices</span><span className="text-right">Total Paid</span></div>
          {data.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_80px_100px] gap-2 px-4 py-2 text-sm border-b border-gray-50"><span className="font-medium">{cn(r)}</span><span className="text-right text-gray-600">{r.invoice_count}</span><span className="text-right tabular-nums font-medium text-green-600">{fmt(r.total_paid)}</span></div>
          ))}
          {data.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">No income in this period.</div>}
        </div>
      ) : <p className="text-sm text-gray-400">Click "Generate Report" to load data.</p>}
    </div>
  );
}

function TaxReport({ data, onLoad, onExport }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onLoad} className="px-3 py-1.5 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded">Generate Report</button>
        {data && <button onClick={() => onExport(['Tax', 'Amount'], data.map((r) => [r.tax_name || 'Unknown', r.total_tax.toFixed(2)]), 'tax-collected.csv')} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">Export CSV</button>}
      </div>
      {data ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_120px] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase border-b border-gray-100"><span>Tax Rate</span><span className="text-right">Amount Collected</span></div>
          {data.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px] gap-2 px-4 py-2 text-sm border-b border-gray-50"><span className="font-medium">{r.tax_name || 'Unknown'}</span><span className="text-right tabular-nums">{fmt(r.total_tax)}</span></div>
          ))}
          {data.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">No tax collected in this period.</div>}
        </div>
      ) : <p className="text-sm text-gray-400">Click "Generate Report" to load data.</p>}
    </div>
  );
}

function OutstandingReport({ data, onLoad, onExport }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onLoad} className="px-3 py-1.5 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded">Generate Report</button>
        {data && <button onClick={() => onExport(['Invoice', 'Client', 'Due Date', 'Amount'], data.map((r) => [r.invoice_number, cn(r), r.due_date, r.total.toFixed(2)]), 'outstanding-invoices.csv')} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">Export CSV</button>}
      </div>
      {data ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[100px_1fr_100px_100px] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase border-b border-gray-100"><span>Invoice</span><span>Client</span><span className="text-right">Due</span><span className="text-right">Amount</span></div>
          {data.map((inv) => (
            <div key={inv.id} className="grid grid-cols-[100px_1fr_100px_100px] gap-2 px-4 py-2 text-sm border-b border-gray-50"><span className="font-medium">{inv.invoice_number}</span><span className="text-gray-600">{cn(inv)}</span><span className="text-right text-red-500 text-xs">{inv.due_date}</span><span className="text-right tabular-nums font-medium text-red-600">{fmt(inv.total)}</span></div>
          ))}
          {data.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">No outstanding invoices.</div>}
        </div>
      ) : <p className="text-sm text-gray-400">Click "Generate Report" to load data.</p>}
    </div>
  );
}
