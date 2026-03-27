import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/shared/Sidebar';
import Toolbar from './components/shared/Toolbar';
import ClientView from './components/clients/ClientView';
import ClientForm from './components/clients/ClientForm';
import SettingsPanel from './components/settings/SettingsPanel';

export default function App() {
  const [clientGroups, setClientGroups] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [view, setView] = useState('dashboard');

  // Client form state
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [defaultGroupId, setDefaultGroupId] = useState(null);

  const loadClientGroups = useCallback(async () => {
    try {
      const groups = await window.api.getClientGroups();
      setClientGroups(groups);
    } catch (err) {
      console.error('Failed to load client groups:', err);
    }
  }, []);

  useEffect(() => {
    loadClientGroups();
  }, []);

  function handleAddClient(groupId) {
    setEditingClient(null);
    setDefaultGroupId(groupId || null);
    setClientFormOpen(true);
  }

  function handleEditClient(client) {
    setEditingClient(client);
    setDefaultGroupId(null);
    setClientFormOpen(true);
  }

  async function handleClientSaved() {
    await loadClientGroups();
    // Refresh selected client if it was being edited
    if (editingClient && selectedClient?.id === editingClient.id) {
      try {
        const updated = await window.api.getClient(editingClient.id);
        setSelectedClient(updated);
      } catch {
        // ignore
      }
    }
  }

  function handleSelectClient(client) {
    setSelectedClient(client);
    if (client) setView('client');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left Sidebar — 220px */}
      <Sidebar
        clientGroups={clientGroups}
        selectedClient={selectedClient}
        onSelectClient={handleSelectClient}
        onNavigate={setView}
        currentView={view}
        onRefreshGroups={loadClientGroups}
        onAddClient={handleAddClient}
        onEditClient={handleEditClient}
      />

      {/* Main Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Toolbar */}
        <Toolbar
          view={view}
          selectedClient={selectedClient}
          onNewProject={() => {
            if (selectedClient) {
              // Trigger new project from ClientView
              setView('client');
            }
          }}
          onEditClient={() => {
            if (selectedClient) handleEditClient(selectedClient);
          }}
          onNewClient={() => handleAddClient(null)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {view === 'client' && selectedClient ? (
            <ClientView client={selectedClient} />
          ) : view === 'settings' ? (
            <SettingsPanel />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <h2 className="text-2xl font-light mb-2">Krull D+A Billings</h2>
                <p className="text-sm">Select a client or navigate from the sidebar to get started.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Client Form Modal */}
      <ClientForm
        open={clientFormOpen}
        onClose={() => setClientFormOpen(false)}
        client={editingClient}
        clientGroups={clientGroups}
        defaultGroupId={defaultGroupId}
        onSaved={handleClientSaved}
      />
    </div>
  );
}
