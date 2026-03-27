import React, { useState, useEffect } from 'react';
import Sidebar from './components/shared/Sidebar';
import Toolbar from './components/shared/Toolbar';

export default function App() {
  const [clientGroups, setClientGroups] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    loadClientGroups();
  }, []);

  async function loadClientGroups() {
    try {
      const groups = await window.api.getClientGroups();
      setClientGroups(groups);
    } catch (err) {
      console.error('Failed to load client groups:', err);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left Sidebar — 220px */}
      <Sidebar
        clientGroups={clientGroups}
        selectedClient={selectedClient}
        onSelectClient={setSelectedClient}
        onNavigate={setView}
        currentView={view}
      />

      {/* Main Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Toolbar */}
        <Toolbar view={view} selectedClient={selectedClient} />

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <h2 className="text-2xl font-light mb-2">Krull D+A Billings</h2>
              <p className="text-sm">Select a client or navigate from the sidebar to get started.</p>
              <p className="text-xs mt-4 text-gray-300">Session 1 — Scaffold Complete</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
