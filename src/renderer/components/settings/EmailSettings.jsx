import React, { useState, useEffect } from 'react';

const PLACEHOLDERS = ['{client_name}', '{document_number}', '{total}', '{business_name}'];

export default function EmailSettings() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

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

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.api.testSmtp({
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_pass: settings.smtp_pass,
      });
      setTestResult(result.ok ? { ok: true } : { ok: false, error: result.error });
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    }
    setTesting(false);
  }

  return (
    <div className="max-w-lg space-y-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Email / SMTP</h3>

      <div className="grid grid-cols-2 gap-3">
        <InputField label="SMTP Host" value={settings.smtp_host} onChange={(v) => update('smtp_host', v)} placeholder="smtp.gmail.com" />
        <InputField label="SMTP Port" value={settings.smtp_port} onChange={(v) => update('smtp_port', v)} placeholder="587" />
      </div>

      <InputField label="Username" value={settings.smtp_user} onChange={(v) => update('smtp_user', v)} />

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} value={settings.smtp_pass || ''} onChange={(e) => update('smtp_pass', e.target.value)} className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">{showPassword ? 'Hide' : 'Show'}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InputField label="From Name" value={settings.smtp_from_name} onChange={(v) => update('smtp_from_name', v)} placeholder="Krull D+A" />
        <InputField label="From Email" value={settings.smtp_from_email} onChange={(v) => update('smtp_from_email', v)} placeholder="invoices@krulldna.com" />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={testConnection} disabled={testing || !settings.smtp_host} className={`px-3 py-1.5 text-xs rounded-md border ${testing || !settings.smtp_host ? 'text-gray-300 border-gray-200' : 'text-brand-600 border-brand-200 hover:bg-brand-50'}`}>
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        {testResult && (
          <span className={`text-xs ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
            {testResult.ok ? 'Connection successful!' : `Failed: ${testResult.error}`}
          </span>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Invoice Email Defaults</h4>
        <InputField label="Subject" value={settings.email_invoice_subject} onChange={(v) => update('email_invoice_subject', v)} placeholder="Invoice {document_number} from {business_name}" />
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
          <textarea value={settings.email_invoice_body || ''} onChange={(e) => update('email_invoice_body', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" placeholder="Please find attached invoice {document_number}..." />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Estimate Email Defaults</h4>
        <InputField label="Subject" value={settings.email_estimate_subject} onChange={(v) => update('email_estimate_subject', v)} placeholder="Estimate {document_number} from {business_name}" />
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
          <textarea value={settings.email_estimate_body || ''} onChange={(e) => update('email_estimate_body', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" placeholder="Please find attached estimate {document_number}..." />
        </div>
      </div>

      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-[10px] text-gray-500">Available placeholders: {PLACEHOLDERS.map((p) => <code key={p} className="bg-gray-200 px-1 py-0.5 rounded mx-0.5">{p}</code>)}</p>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button onClick={save} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md">{saved ? 'Saved!' : 'Save'}</button>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
    </div>
  );
}
