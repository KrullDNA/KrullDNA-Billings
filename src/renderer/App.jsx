import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './components/shared/Toast';
import Sidebar from './components/shared/Sidebar';
import Toolbar from './components/shared/Toolbar';
import ClientView from './components/clients/ClientView';
import ClientForm from './components/clients/ClientForm';
import SettingsPanel from './components/settings/SettingsPanel';
import Dashboard from './components/dashboard/Dashboard';
import AllSlips from './components/lineitems/AllSlips';
import UnfiledSlips from './components/lineitems/UnfiledSlips';
import Approvals from './components/estimates/Approvals';
import Reports from './components/dashboard/Reports';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function lighten(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

function darken(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  return `#${Math.round(r * (1 - factor)).toString(16).padStart(2, '0')}${Math.round(g * (1 - factor)).toString(16).padStart(2, '0')}${Math.round(b * (1 - factor)).toString(16).padStart(2, '0')}`;
}

export function applyBrandColour(primary, lightOverride) {
  const root = document.documentElement;
  root.style.setProperty('--brand-600', primary);
  root.style.setProperty('--brand-700', darken(primary, 0.1));
  root.style.setProperty('--brand-800', darken(primary, 0.2));
  root.style.setProperty('--brand-900', darken(primary, 0.3));
  root.style.setProperty('--brand-500', lighten(primary, 0.1));
  root.style.setProperty('--brand-400', lighten(primary, 0.25));
  root.style.setProperty('--brand-300', lighten(primary, 0.4));
  root.style.setProperty('--brand-200', lightOverride || lighten(primary, 0.55));
  root.style.setProperty('--brand-100', lightOverride ? lighten(lightOverride, 0.4) : lighten(primary, 0.75));
  root.style.setProperty('--brand-50', lightOverride ? lighten(lightOverride, 0.7) : lighten(primary, 0.9));
}

export default function App() {
  const [clientGroups, setClientGroups] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [view, setView] = useState('dashboard');

  // Client form state
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [defaultGroupId, setDefaultGroupId] = useState(null);

  // New project trigger (increments to signal ClientView)
  const [newProjectTrigger, setNewProjectTrigger] = useState(0);

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

  // Load brand colour and apply CSS variables
  useEffect(() => {
    async function loadBrandColour() {
      try {
        const settings = await window.api.getSettings();
        const hex = settings.brand_colour || settings.brand_colour_primary || '#4c6ef5';
        const hexLight = settings.brand_colour_light || null;
        applyBrandColour(hex, hexLight);
      } catch {}
    }
    loadBrandColour();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      const meta = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape') {
        if (clientFormOpen) setClientFormOpen(false);
      }
      if (meta && e.key === 'n') {
        e.preventDefault();
        handleAddClient(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clientFormOpen]);

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
    if (editingClient && selectedClient?.id === editingClient.id) {
      try {
        const updated = await window.api.getClient(editingClient.id);
        setSelectedClient(updated);
      } catch { /* ignore */ }
    }
  }

  function handleSelectClient(client) {
    setSelectedClient(client);
    if (client) setView('client');
  }

  function renderContent() {
    switch (view) {
      case 'client':
        return selectedClient ? <ClientView client={selectedClient} newProjectRequested={newProjectTrigger} /> : <EmptyState />;
      case 'settings':
        return <SettingsPanel />;
      case 'dashboard':
        return <Dashboard />;
      case 'allslips':
        return <AllSlips />;
      case 'unfiled':
        return <UnfiledSlips />;
      case 'approvals':
        return <Approvals />;
      case 'reports':
        return <Reports />;
      default:
        return <EmptyState />;
    }
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-white">
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

        <div className="flex flex-1 flex-col min-w-0">
          <Toolbar
            view={view}
            selectedClient={selectedClient}
            onNewProject={() => { if (selectedClient) { setView('client'); setNewProjectTrigger((n) => n + 1); } }}
            onEditClient={() => { if (selectedClient) handleEditClient(selectedClient); }}
            onNewClient={() => handleAddClient(null)}
          />

          <main className="flex-1 overflow-hidden">
            {renderContent()}
          </main>
        </div>

        <ClientForm
          open={clientFormOpen}
          onClose={() => setClientFormOpen(false)}
          client={editingClient}
          clientGroups={clientGroups}
          defaultGroupId={defaultGroupId}
          onSaved={handleClientSaved}
        />
      </div>
    </ToastProvider>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <h2 className="text-2xl font-light mb-2">Krull D+A Billings</h2>
        <p className="text-sm">Select a client or navigate from the sidebar to get started.</p>
      </div>
    </div>
  );
}
