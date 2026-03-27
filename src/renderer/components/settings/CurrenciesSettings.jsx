import React, { useState, useEffect } from 'react';

const ALL_CURRENCIES = [
  { code: 'AUD', symbol: '$', name: 'Australian Dollar', preview: '$12,718.65' },
  { code: 'USD', symbol: '$', name: 'US Dollar', preview: '$12,718.65' },
  { code: 'EUR', symbol: '\u20ac', name: 'Euro', preview: '\u20ac12,718.65' },
  { code: 'GBP', symbol: '\u00a3', name: 'British Pound', preview: '\u00a312,718.65' },
  { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', preview: '$12,718.65' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar', preview: '$12,718.65' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar', preview: '$12,718.65' },
];

export default function CurrenciesSettings() {
  const [enabled, setEnabled] = useState(['AUD']);
  const [defaultCurrency, setDefaultCurrency] = useState('AUD');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const settings = await window.api.getSettings();
      setDefaultCurrency(settings.default_currency || 'AUD');
      const enabledList = settings.enabled_currencies ? JSON.parse(settings.enabled_currencies) : ['AUD'];
      setEnabled(enabledList);
    } catch (err) { console.error(err); }
  }

  async function toggleCurrency(code) {
    let updated;
    if (enabled.includes(code)) {
      if (code === defaultCurrency) return; // Can't disable default
      updated = enabled.filter((c) => c !== code);
    } else {
      updated = [...enabled, code];
    }
    setEnabled(updated);
    await window.api.saveSetting('enabled_currencies', JSON.stringify(updated));
  }

  async function handleSetDefault(code) {
    if (!enabled.includes(code)) {
      const updated = [...enabled, code];
      setEnabled(updated);
      await window.api.saveSetting('enabled_currencies', JSON.stringify(updated));
    }
    setDefaultCurrency(code);
    await window.api.saveSetting('default_currency', code);
  }

  return (
    <div className="max-w-lg">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Currencies</h3>
      <p className="text-xs text-gray-500 mb-4">Enable currencies and set the default.</p>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {ALL_CURRENCIES.map((cur) => (
          <div key={cur.code} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={enabled.includes(cur.code)}
              onChange={() => toggleCurrency(cur.code)}
              disabled={cur.code === defaultCurrency}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">{cur.code}</span>
              <span className="text-xs text-gray-500 ml-2">{cur.name}</span>
            </div>
            <span className="text-xs text-gray-400 tabular-nums mr-3">{cur.preview}</span>
            {defaultCurrency === cur.code ? (
              <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Default</span>
            ) : (
              <button onClick={() => handleSetDefault(cur.code)} className="text-[10px] text-gray-400 hover:text-brand-600">Set default</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
