import React, { useState, useEffect } from 'react';

export default function Sidebar({ clientGroups, selectedClient, onSelectClient, onNavigate, currentView }) {
  const [clientsByGroup, setClientsByGroup] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    loadClients();
  }, [clientGroups]);

  async function loadClients() {
    const grouped = {};
    for (const group of clientGroups) {
      try {
        const clients = await window.api.getClients(group.id);
        grouped[group.id] = clients;
      } catch {
        grouped[group.id] = [];
      }
    }
    setClientsByGroup(grouped);
    // Expand groups that have clients by default
    const expanded = {};
    for (const group of clientGroups) {
      expanded[group.id] = true;
    }
    setExpandedGroups(expanded);
  }

  function toggleGroup(groupId) {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  return (
    <aside className="w-[220px] min-w-[220px] bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Drag region for macOS traffic lights */}
      <div className="drag-region h-10 flex items-end px-4 pb-1">
        <span className="no-drag text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Clients
        </span>
      </div>

      {/* Client Groups + Client List */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {clientGroups.map((group) => (
          <div key={group.id} className="mb-1">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 rounded"
            >
              <svg
                className={`w-3 h-3 transition-transform ${expandedGroups[group.id] ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {group.name}
            </button>

            {/* Client List */}
            {expandedGroups[group.id] && (
              <div className="ml-2">
                {(clientsByGroup[group.id] || []).map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      onSelectClient(client);
                      onNavigate('client');
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md truncate ${
                      selectedClient?.id === client.id
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {client.is_company ? client.company : `${client.first_name} ${client.last_name}`}
                  </button>
                ))}
                {(clientsByGroup[group.id] || []).length === 0 && (
                  <p className="px-3 py-1 text-xs text-gray-400 italic">No clients</p>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom: Dashboard + Settings links */}
      <div className="border-t border-gray-200 px-2 py-2 space-y-0.5">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
            currentView === 'dashboard' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
            currentView === 'settings' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Settings
        </button>
      </div>

      {/* User info */}
      <div className="border-t border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-400 truncate">Krull D+A</p>
      </div>
    </aside>
  );
}
