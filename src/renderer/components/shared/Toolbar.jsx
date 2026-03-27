import React from 'react';

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  allslips: 'All Line Items',
  unfiled: 'Unfiled Line Items',
  approvals: 'Approvals',
  reports: 'Reports',
};

export default function Toolbar({ view, selectedClient, onNewProject, onEditClient, onNewClient }) {
  function clientDisplayName(client) {
    if (client.is_company && client.company) return client.company;
    return [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Unnamed Client';
  }

  const title = view === 'client' && selectedClient
    ? clientDisplayName(selectedClient)
    : VIEW_TITLES[view] || '';

  return (
    <header className="drag-region h-12 min-h-[48px] bg-white border-b border-gray-200 flex items-center px-4 gap-2">
      <div className="flex-1 flex items-center gap-2 no-drag">
        {title && <h1 className="text-sm font-medium text-gray-800 truncate">{title}</h1>}
      </div>

      <div className="flex items-center gap-1 no-drag">
        {view === 'client' && selectedClient && (
          <>
            <ToolbarButton label="New Project" onClick={onNewProject} />
            <ToolbarButton label="Edit Client" onClick={onEditClient} />
            <ToolbarDivider />
          </>
        )}
        <ToolbarButton label="New Client" onClick={onNewClient} />
      </div>
    </header>
  );
}

function ToolbarButton({ label, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-gray-200 mx-1" />;
}
