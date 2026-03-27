import React, { useState, useEffect } from 'react';

export default function IdentitySettings() {
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

  async function handleLogoUpload() {
    // Use a file input trick since we can't trigger native dialog from renderer directly
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/svg+xml';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const result = await window.api.uploadLogo(file.path);
        update('logo_path', result);
      } catch (err) { console.error(err); }
    };
    input.click();
  }

  async function handleRemoveLogo() {
    update('logo_path', '');
    await window.api.saveSetting('logo_path', '');
  }

  return (
    <div className="max-w-lg space-y-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Identity & Rates</h3>

      {/* Logo */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
            {settings.logo_path ? (
              <img src={`file://${settings.logo_path}`} className="w-full h-full object-contain" alt="Logo" />
            ) : (
              <span className="text-xs text-gray-400">No Logo</span>
            )}
          </div>
          <div className="space-y-1">
            <button onClick={handleLogoUpload} className="px-3 py-1.5 text-xs text-brand-600 border border-brand-200 rounded hover:bg-brand-50">Upload Logo</button>
            {settings.logo_path && <button onClick={handleRemoveLogo} className="block px-3 py-1.5 text-xs text-red-500 hover:text-red-600">Remove</button>}
          </div>
        </div>
      </div>

      <InputField label="Business Name" value={settings.business_name} onChange={(v) => update('business_name', v)} />
      <InputField label="ABN / Tax Number" value={settings.abn} onChange={(v) => update('abn', v)} />

      <fieldset className="border border-gray-200 rounded-md p-3 space-y-2">
        <legend className="text-xs font-medium text-gray-500 px-1">Address</legend>
        <input placeholder="Street" value={settings.address_street || ''} onChange={(e) => update('address_street', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="City" value={settings.address_city || ''} onChange={(e) => update('address_city', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <input placeholder="State" value={settings.address_state || ''} onChange={(e) => update('address_state', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Postcode" value={settings.address_postcode || ''} onChange={(e) => update('address_postcode', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <input placeholder="Country" value={settings.address_country || ''} onChange={(e) => update('address_country', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
      </fieldset>

      <InputField label="Phone" value={settings.phone} onChange={(v) => update('phone', v)} />
      <InputField label="Email" value={settings.email} onChange={(v) => update('email', v)} />
      <InputField label="Website" value={settings.website} onChange={(v) => update('website', v)} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Default Hourly Rate</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input type="number" step="0.01" value={settings.default_hourly_rate || ''} onChange={(e) => update('default_hourly_rate', e.target.value)} className="w-full pl-7 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">/hr</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Default Mileage Rate</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input type="number" step="0.01" value={settings.default_mileage_rate || ''} onChange={(e) => update('default_mileage_rate', e.target.value)} className="w-full pl-7 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">/km</span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button onClick={save} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md">{saved ? 'Saved!' : 'Save'}</button>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500" />
    </div>
  );
}
