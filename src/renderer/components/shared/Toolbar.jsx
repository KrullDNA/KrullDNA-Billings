import React from 'react';

export default function Toolbar({ view, selectedClient }) {
  return (
    <header className="drag-region h-12 min-h-[48px] bg-white border-b border-gray-200 flex items-center px-4 gap-2">
      {/* Left spacer for macOS traffic lights on the sidebar */}
      <div className="flex-1 flex items-center gap-2 no-drag">
        {view === 'client' && selectedClient && (
          <h1 className="text-sm font-medium text-gray-800 truncate">
            {selectedClient.is_company
              ? selectedClient.company
              : `${selectedClient.first_name} ${selectedClient.last_name}`}
          </h1>
        )}
        {view === 'dashboard' && (
          <h1 className="text-sm font-medium text-gray-800">Dashboard</h1>
        )}
        {view === 'settings' && (
          <h1 className="text-sm font-medium text-gray-800">Settings</h1>
        )}
      </div>

      {/* Action Buttons (context-sensitive, placeholders) */}
      <div className="flex items-center gap-1 no-drag">
        <ToolbarButton label="New Project" />
        <ToolbarButton label="Search" />
      </div>
    </header>
  );
}

function ToolbarButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
    >
      {label}
    </button>
  );
}
