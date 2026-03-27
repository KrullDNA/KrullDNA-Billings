import React, { useState } from 'react';
import GeneralSettings from './GeneralSettings';
import IdentitySettings from './IdentitySettings';
import CurrenciesSettings from './CurrenciesSettings';
import TaxesSettings from './TaxesSettings';
import TemplatesSettings from './TemplatesSettings';
import NumberingSettings from './NumberingSettings';
import EmailSettings from './EmailSettings';
import CategoriesSettings from './CategoriesSettings';
import ClientGroupsSettings from './ClientGroupsSettings';
import PaymentMethodsSettings from './PaymentMethodsSettings';

const TABS = [
  { id: 'general', label: 'General', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'identity', label: 'Identity & Rates', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'currencies', label: 'Currencies', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'taxes', label: 'Taxes', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  { id: 'templates', label: 'Templates', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { id: 'numbering', label: 'Numbering', icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14' },
  { id: 'labels', label: 'Labels', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
  { id: 'email', label: 'Email / SMTP', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('general');
  const [labelsSubTab, setLabelsSubTab] = useState('categories');

  return (
    <div className="flex h-full">
      {/* Settings Sidebar */}
      <div className="w-48 min-w-[192px] bg-gray-50 border-r border-gray-200 py-4 px-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Preferences</h3>
        <nav className="space-y-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm rounded-md ${
                activeTab === tab.id ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'identity' && <IdentitySettings />}
        {activeTab === 'currencies' && <CurrenciesSettings />}
        {activeTab === 'taxes' && <TaxesSettings />}
        {activeTab === 'templates' && <TemplatesSettings />}
        {activeTab === 'numbering' && <NumberingSettings />}
        {activeTab === 'email' && <EmailSettings />}
        {activeTab === 'labels' && (
          <div>
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
              {[
                { id: 'categories', label: 'Categories' },
                { id: 'client-groups', label: 'Client Groups' },
                { id: 'payment-methods', label: 'Payment Methods' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setLabelsSubTab(sub.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    labelsSubTab === sub.id
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
            {labelsSubTab === 'categories' && <CategoriesSettings />}
            {labelsSubTab === 'client-groups' && <ClientGroupsSettings />}
            {labelsSubTab === 'payment-methods' && <PaymentMethodsSettings />}
          </div>
        )}
      </div>
    </div>
  );
}
