import React, { useState, useEffect } from 'react';

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'];
const CURRENCY_FORMATS = ['$1,234.56', '1.234,56 $', '1 234,56 $'];

export default function GeneralSettings() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setSettings(await window.api.getSettings()); } catch (err) { console.error(err); }
  }

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    try {
      await window.api.saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-4">General</h3>
      </div>

      <Field label="Date Format">
        <select value={settings.date_format || 'DD/MM/YYYY'} onChange={(e) => update('date_format', e.target.value)} className="input-field">
          {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>

      <Field label="Currency Display">
        <select value={settings.currency_format || '$1,234.56'} onChange={(e) => update('currency_format', e.target.value)} className="input-field">
          {CURRENCY_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>

      <Field label="Default Currency">
        <select value={settings.default_currency || 'AUD'} onChange={(e) => update('default_currency', e.target.value)} className="input-field">
          {['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'CAD', 'SGD'].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <Field label="Default Project Status">
        <select value={settings.default_project_status || 'active'} onChange={(e) => update('default_project_status', e.target.value)} className="input-field">
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </Field>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Auto-save interval (seconds)</span>
        <input type="number" min={5} value={settings.autosave_interval || 30} onChange={(e) => update('autosave_interval', e.target.value)} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 text-right" />
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button onClick={save} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md">
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      {children}
    </div>
  );
}
