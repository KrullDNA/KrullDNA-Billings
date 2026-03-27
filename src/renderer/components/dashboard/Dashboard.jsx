import React, { useState, useEffect } from 'react';

const CURRENCY_SYMBOLS = { AUD: '$', USD: '$', EUR: '\u20ac', GBP: '\u00a3', NZD: '$', CAD: '$', SGD: '$' };
function fmt(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(status) {
  const styles = { draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-400', approved: 'bg-green-100 text-green-700', declined: 'bg-red-100 text-red-700', expired: 'bg-amber-100 text-amber-700' };
  return styles[status] || 'bg-gray-100 text-gray-600';
}

function clientName(row) {
  if (row.is_company && row.company) return row.company;
  return [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unknown';
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function load() {
      try { setStats(await window.api.getDashboardStats()); } catch (err) { console.error(err); }
    }
    load();
  }, []);

  if (!stats) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card label="Outstanding Invoices" value={fmt(stats.outstandingTotal)} sub={`${stats.outstandingCount} invoice${stats.outstandingCount !== 1 ? 's' : ''}`} color="text-blue-600" />
        <Card label="Paid This Month" value={fmt(stats.paidThisMonth)} color="text-green-600" />
        <Card label="Estimates Pending" value={stats.pendingEstimates} color="text-purple-600" />
        <Card label="Active Clients" value={stats.clientCount} color="text-gray-800" />
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* Recent Activity */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {stats.recentActivity.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No recent activity</div>
            ) : stats.recentActivity.map((row, i) => (
              <div key={`${row.doc_type}-${row.id}-${i}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 text-sm">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                  row.doc_type === 'invoice' ? 'bg-blue-50 text-blue-600' : row.doc_type === 'estimate' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                }`}>{row.doc_type === 'invoice' ? 'INV' : row.doc_type === 'estimate' ? 'EST' : 'PAY'}</span>
                <span className="font-medium text-gray-700 truncate">{row.number || 'Payment'}</span>
                <span className="text-gray-500 truncate flex-1">{clientName(row)}</span>
                <span className={`tabular-nums ${row.doc_type === 'payment' ? 'text-green-600' : 'text-gray-700'}`}>{row.doc_type === 'payment' ? '-' : ''}{fmt(row.amount)}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusBadge(row.status)}`}>{row.status?.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Invoices */}
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-3">Overdue Invoices {stats.overdueCount > 0 && `(${stats.overdueCount})`}</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {stats.overdueInvoices.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No overdue invoices</div>
            ) : stats.overdueInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-red-50 text-sm">
                <span className="font-medium text-gray-700">{inv.invoice_number}</span>
                <span className="text-gray-500 truncate flex-1">{clientName(inv)}</span>
                <span className="text-xs text-red-500">{inv.due_date}</span>
                <span className="tabular-nums font-medium text-red-600">{fmt(inv.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
