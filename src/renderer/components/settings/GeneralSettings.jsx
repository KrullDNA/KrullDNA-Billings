import React, { useState, useEffect } from 'react';
import { applyBrandColour } from '../../App';

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'];
const CURRENCY_FORMATS = ['$1,234.56', '1.234,56 $', '1 234,56 $'];

const COLOUR_PRESETS = [
  { label: 'Blue', primary: '#4c6ef5', light: '#dbe4ff' },
  { label: 'Purple', primary: '#7c3aed', light: '#ede9fe' },
  { label: 'Teal', primary: '#0d9488', light: '#ccfbf1' },
  { label: 'Green', primary: '#16a34a', light: '#dcfce7' },
  { label: 'Orange', primary: '#ea580c', light: '#ffedd5' },
  { label: 'Red', primary: '#dc2626', light: '#fee2e2' },
  { label: 'Pink', primary: '#db2777', light: '#fce7f3' },
  { label: 'Slate', primary: '#475569', light: '#e2e8f0' },
  { label: 'Black', primary: '#1a1a1a', light: '#e5e5e5' },
];

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

  function handleColourChange(primary, light) {
    update('brand_colour', primary);
    update('brand_colour_light', light || '');
    applyBrandColour(primary, light || null);
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

      {/* Brand Colour */}
      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Brand Colour</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {COLOUR_PRESETS.map((preset) => (
            <button
              key={preset.primary}
              onClick={() => handleColourChange(preset.primary, preset.light)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                settings.brand_colour === preset.primary ? 'border-gray-800 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: preset.primary }}
              title={preset.label}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Primary</label>
            <input
              type="color"
              value={settings.brand_colour || '#4c6ef5'}
              onChange={(e) => handleColourChange(e.target.value, settings.brand_colour_light || '')}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200"
            />
            <span className="text-xs text-gray-400 font-mono">{settings.brand_colour || '#4c6ef5'}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Light</label>
            <input
              type="color"
              value={settings.brand_colour_light || '#dbe4ff'}
              onChange={(e) => handleColourChange(settings.brand_colour || '#4c6ef5', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200"
            />
            <span className="text-xs text-gray-400 font-mono">{settings.brand_colour_light || '#dbe4ff'}</span>
          </div>
        </div>
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
