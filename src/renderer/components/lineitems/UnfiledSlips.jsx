import React, { useState, useEffect } from 'react';

export default function UnfiledSlips() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setItems(await window.api.getUnfiledLineItems());
    } catch (err) { console.error(err); }
  }

  async function handleAssign(lineItemId, projectId) {
    if (!projectId) return;
    try {
      await window.api.updateLineItem(lineItemId, { project_id: parseInt(projectId) });
      load();
    } catch (err) { console.error(err); }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">Unfiled Line Items</h2>
        <p className="text-xs text-gray-500 mt-0.5">Line items not assigned to any project.</p>
      </div>

      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No unfiled line items.</div>
        ) : items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-6 py-3 border-b border-gray-50 hover:bg-gray-50">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{item.name}</p>
              <p className="text-xs text-gray-500">{item.category_name || 'No category'}</p>
            </div>
            <span className="text-sm tabular-nums text-gray-600">${(item.total || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
