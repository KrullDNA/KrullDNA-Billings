import React, { useState, useEffect } from 'react';

function fmt(a) { return `$${(a || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function cn(r) { return r.is_company ? r.company : [r.first_name, r.last_name].filter(Boolean).join(' '); }

export default function Approvals() {
  const [estimates, setEstimates] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setEstimates(await window.api.getPendingEstimates()); } catch (err) { console.error(err); }
  }

  async function handleAction(id, status) {
    try { await window.api.updateEstimateStatus(id, status); load(); } catch (err) { console.error(err); }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">Approvals</h2>
        <p className="text-xs text-gray-500 mt-0.5">Estimates awaiting client response.</p>
      </div>

      <div className="flex-1 overflow-auto">
        {estimates.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No estimates pending approval.</div>
        ) : estimates.map((est) => (
          <div key={est.id} className="flex items-center gap-4 px-6 py-3 border-b border-gray-50 hover:bg-gray-50">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{est.estimate_number}</p>
              <p className="text-xs text-gray-500">{cn(est)}</p>
            </div>
            <span className="text-xs text-gray-500">{est.estimate_date}</span>
            <span className="text-sm tabular-nums font-medium">{fmt(est.total)}</span>
            <div className="flex gap-1">
              <button onClick={() => handleAction(est.id, 'approved')} className="px-2 py-1 text-[10px] text-green-600 bg-green-50 hover:bg-green-100 rounded font-medium">Approve</button>
              <button onClick={() => handleAction(est.id, 'declined')} className="px-2 py-1 text-[10px] text-red-600 bg-red-50 hover:bg-red-100 rounded font-medium">Decline</button>
            </div>
          </div>
        ))}
      </div>

      <div className="h-8 bg-gray-50 border-t border-gray-200 flex items-center px-6 text-xs text-gray-500">{estimates.length} pending</div>
    </div>
  );
}
