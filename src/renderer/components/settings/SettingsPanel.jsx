import React, { useState } from 'react';
import CategoriesSettings from './CategoriesSettings';
import TemplatesSettings from './TemplatesSettings';

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('labels');
  const [activeSubTab, setActiveSubTab] = useState('categories');

  return (
    <div className="flex h-full">
      {/* Settings Sidebar */}
      <div className="w-48 min-w-[192px] bg-gray-50 border-r border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preferences</h3>
        <nav className="space-y-0.5">
          <SettingsNavButton
            label="Labels"
            active={activeTab === 'labels'}
            onClick={() => setActiveTab('labels')}
          />
          <SettingsNavButton
            label="Business"
            active={activeTab === 'business'}
            onClick={() => setActiveTab('business')}
          />
          <SettingsNavButton
            label="Invoicing"
            active={activeTab === 'invoicing'}
            onClick={() => setActiveTab('invoicing')}
          />
          <SettingsNavButton
            label="Email"
            active={activeTab === 'email'}
            onClick={() => setActiveTab('email')}
          />
          <SettingsNavButton
            label="Templates"
            active={activeTab === 'templates'}
            onClick={() => setActiveTab('templates')}
          />
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'labels' && (
          <div>
            {/* Sub-tabs for Labels */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveSubTab('categories')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  activeSubTab === 'categories'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveSubTab('client-groups')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  activeSubTab === 'client-groups'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Client Groups
              </button>
              <button
                onClick={() => setActiveSubTab('taxes')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  activeSubTab === 'taxes'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Taxes
              </button>
            </div>

            {activeSubTab === 'categories' && <CategoriesSettings />}
            {activeSubTab === 'client-groups' && (
              <p className="text-sm text-gray-400">Client Groups management will be enhanced in Session 7.</p>
            )}
            {activeSubTab === 'taxes' && (
              <p className="text-sm text-gray-400">Tax rates management will be enhanced in Session 7.</p>
            )}
          </div>
        )}

        {activeTab === 'templates' && <TemplatesSettings />}

        {activeTab !== 'labels' && activeTab !== 'templates' && (
          <div className="text-sm text-gray-400">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings will be built in Session 7.
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsNavButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
        active ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}
