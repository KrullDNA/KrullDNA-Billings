import React, { useState, useEffect } from 'react';
import Builder from '../builder/Builder';
import Modal from '../shared/Modal';

export default function TemplatesSettings() {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveType, setSaveType] = useState('invoice');
  const [settings, setSettings] = useState({});

  useEffect(() => {
    loadTemplates();
    loadSettings();
  }, []);

  async function loadTemplates() {
    try { setTemplates(await window.api.getTemplates()); } catch (err) { console.error(err); }
  }

  async function loadSettings() {
    try { setSettings(await window.api.getSettings()); } catch (err) { console.error(err); }
  }

  function handleEdit(template) {
    setEditingTemplate(template);
    setBlocks(JSON.parse(template.blocks_json || '[]'));
    setShowBuilder(true);
  }

  function handleNew() {
    setEditingTemplate(null);
    setBlocks([]);
    setShowBuilder(true);
  }

  async function handleDuplicate(template) {
    try {
      await window.api.saveTemplate({
        name: template.name + ' (Copy)',
        type: template.type,
        blocks_json: template.blocks_json,
        is_default: 0,
      });
      loadTemplates();
    } catch (err) { console.error(err); }
  }

  async function handleDelete(template) {
    try {
      await window.api.deleteTemplate(template.id);
      loadTemplates();
    } catch (err) { console.error(err); }
  }

  async function handleSetDefault(template) {
    try {
      await window.api.setDefaultTemplate(template.id, template.type);
      loadTemplates();
    } catch (err) { console.error(err); }
  }

  function handleSaveTemplate() {
    if (editingTemplate) {
      setSaveName(editingTemplate.name);
      setSaveType(editingTemplate.type);
    } else {
      setSaveName('');
      setSaveType('invoice');
    }
    setSaveModalOpen(true);
  }

  async function handleSaveConfirm() {
    if (!saveName.trim()) return;
    try {
      await window.api.saveTemplate({
        id: editingTemplate?.id || undefined,
        name: saveName.trim(),
        type: saveType,
        blocks_json: JSON.stringify(blocks),
        is_default: editingTemplate?.is_default || 0,
      });
      setSaveModalOpen(false);
      setShowBuilder(false);
      loadTemplates();
    } catch (err) { console.error(err); }
  }

  // Sample data for preview
  const sampleData = {
    settings,
    client: { first_name: 'Sample', last_name: 'Client', company: 'Sample Co', email: 'client@example.com' },
    document: { invoice_number: 'INV-1001', estimate_number: 'EST-1001', invoice_date: '2026-03-27', estimate_date: '2026-03-27', due_date: '2026-04-10', terms: '14 Days', subtotal: 1500, tax_total: 150, total: 1650, notes: 'Payment due within 14 days.' },
    lineItems: [
      { id: 1, name: 'Website Design', category_name: 'DESIGN', quantity: 1, rate: 800, tax_amount: 80, total: 880 },
      { id: 2, name: 'Logo Design', category_name: 'DESIGN', quantity: 1, rate: 400, tax_amount: 40, total: 440 },
      { id: 3, name: 'Frontend Development', category_name: 'DEVELOPMENT', quantity: 1, rate: 300, tax_amount: 30, total: 330 },
    ],
    docType: saveType || editingTemplate?.type || 'invoice',
    currency: 'AUD',
  };

  if (showBuilder) {
    return (
      <div className="flex flex-col h-full -m-6">
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          <button onClick={() => setShowBuilder(false)} className="text-xs text-gray-500 hover:text-gray-700">&larr; Back to Templates</button>
          <span className="text-sm font-medium text-gray-700">{editingTemplate?.name || 'New Template'}</span>
          <button onClick={handleSaveTemplate} className="px-3 py-1 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded">Save</button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Builder
            blocks={blocks}
            onChange={setBlocks}
            data={sampleData}
            onSaveTemplate={handleSaveTemplate}
          />
        </div>

        <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save Template">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Template Name</label>
              <input value={saveName} onChange={(e) => setSaveName(e.target.value)} autoFocus className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={saveType} onChange={(e) => setSaveType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500">
                <option value="invoice">Invoice</option>
                <option value="estimate">Estimate</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setSaveModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={handleSaveConfirm} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md">Save</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Document Templates</h3>
          <p className="text-xs text-gray-500 mt-0.5">Manage invoice and estimate document layouts.</p>
        </div>
        <button onClick={handleNew} className="px-3 py-1.5 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded-md font-medium">New Template</button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px_120px] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
          <span>Name</span><span>Type</span><span>Default</span><span />
        </div>
        {templates.map((t) => (
          <div key={t.id} className="grid grid-cols-[1fr_80px_80px_120px] gap-2 px-4 py-2 text-sm border-b border-gray-50 hover:bg-gray-50 items-center">
            <span className="font-medium truncate">{t.name}</span>
            <span className="text-xs text-gray-500 capitalize">{t.type}</span>
            <span>
              {t.is_default ? (
                <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Default</span>
              ) : (
                <button onClick={() => handleSetDefault(t)} className="text-[10px] text-gray-400 hover:text-brand-600">Set default</button>
              )}
            </span>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(t)} className="px-2 py-0.5 text-[10px] text-brand-600 hover:bg-brand-50 rounded">Edit</button>
              <button onClick={() => handleDuplicate(t)} className="px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 rounded">Duplicate</button>
              <button onClick={() => handleDelete(t)} className="px-2 py-0.5 text-[10px] text-red-500 hover:bg-red-50 rounded">Delete</button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">No templates yet.</div>
        )}
      </div>
    </div>
  );
}
