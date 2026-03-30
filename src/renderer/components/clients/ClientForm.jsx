import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';

const CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'CAD', 'SGD'];
const CURRENCY_SYMBOLS = { AUD: '$', USD: 'US$', EUR: '\u20ac', GBP: '\u00a3', NZD: 'NZ$', CAD: 'CA$', SGD: 'S$' };

const emptyClient = {
  first_name: '',
  last_name: '',
  company: '',
  is_company: 0,
  email: '',
  phone: '',
  address_street: '',
  address_city: '',
  address_state: '',
  address_postcode: '',
  address_country: 'Australia',
  group_id: null,
  tax_id: '',
  client_number: '',
  hourly_rate: 0,
  mileage_rate: 0,
  currency: 'AUD',
  extra_field_1: '',
  extra_field_2: '',
  extra_field_3: '',
  notes: '',
};

export default function ClientForm({ open, onClose, client, clientGroups, defaultGroupId, onSaved }) {
  const [form, setForm] = useState({ ...emptyClient });
  const [additionalAddresses, setAdditionalAddresses] = useState([]);
  const isEditing = Boolean(client?.id);

  useEffect(() => {
    if (open) {
      if (client) {
        setForm({ ...emptyClient, ...client });
        // Parse additional addresses from notes if stored there (future enhancement)
        setAdditionalAddresses([]);
      } else {
        setForm({ ...emptyClient, group_id: defaultGroupId || clientGroups[0]?.id || null });
        setAdditionalAddresses([]);
      }
    }
  }, [open, client, defaultGroupId]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addAddress() {
    setAdditionalAddresses((prev) => [...prev, { street: '', city: '', state: '', postcode: '', country: 'Australia' }]);
  }

  function updateAddress(index, field, value) {
    setAdditionalAddresses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeAddress(index) {
    setAdditionalAddresses((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const data = { ...form };
    data.hourly_rate = parseFloat(data.hourly_rate) || 0;
    data.mileage_rate = parseFloat(data.mileage_rate) || 0;

    // Only include actual client table columns
    const clientFields = [
      'first_name', 'last_name', 'company', 'is_company', 'email', 'phone',
      'address_street', 'address_city', 'address_state', 'address_postcode', 'address_country',
      'group_id', 'tax_id', 'client_number', 'hourly_rate', 'mileage_rate', 'currency',
      'extra_field_1', 'extra_field_2', 'extra_field_3', 'notes',
    ];
    const cleanData = {};
    for (const key of clientFields) {
      if (key in data) cleanData[key] = data[key];
    }

    try {
      if (isEditing) {
        await window.api.updateClient(client.id, cleanData);
      } else {
        await window.api.createClient(cleanData);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save client:', err);
    }
  }

  const sym = CURRENCY_SYMBOLS[form.currency] || '$';

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Client' : 'New Client'} width="max-w-2xl">
      <div className="space-y-4">
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:border-gray-400">
            Photo
          </div>
          <div className="flex-1">
            {/* Company toggle — controls sidebar display name */}
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <input
                type="checkbox"
                checked={form.is_company === 1}
                onChange={(e) => update('is_company', e.target.checked ? 1 : 0)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Show as company name in sidebar
            </label>
          </div>
        </div>

        {/* Company Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
          <input
            value={form.company}
            onChange={(e) => update('company', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        {/* Contact Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
            <input
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
            <input
              value={form.last_name}
              onChange={(e) => update('last_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone || ''}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        {/* Primary Address */}
        <fieldset className="border border-gray-200 rounded-md p-3">
          <legend className="text-xs font-medium text-gray-500 px-1">Address</legend>
          <div className="space-y-2">
            <input
              placeholder="Street"
              value={form.address_street || ''}
              onChange={(e) => update('address_street', e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="City"
                value={form.address_city || ''}
                onChange={(e) => update('address_city', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <input
                placeholder="State"
                value={form.address_state || ''}
                onChange={(e) => update('address_state', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Country"
                value={form.address_country || ''}
                onChange={(e) => update('address_country', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <input
                placeholder="ZIP / Postal Code"
                value={form.address_postcode || ''}
                onChange={(e) => update('address_postcode', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Additional Addresses */}
        {additionalAddresses.map((addr, i) => (
          <fieldset key={i} className="border border-gray-200 rounded-md p-3 relative">
            <legend className="text-xs font-medium text-gray-500 px-1">Address {i + 2}</legend>
            <button onClick={() => removeAddress(i)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm">&times;</button>
            <div className="space-y-2">
              <input placeholder="Street" value={addr.street} onChange={(e) => updateAddress(i, 'street', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="City" value={addr.city} onChange={(e) => updateAddress(i, 'city', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
                <input placeholder="State" value={addr.state} onChange={(e) => updateAddress(i, 'state', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Country" value={addr.country} onChange={(e) => updateAddress(i, 'country', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
                <input placeholder="ZIP / Postal Code" value={addr.postcode} onChange={(e) => updateAddress(i, 'postcode', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>
          </fieldset>
        ))}

        <button onClick={addAddress} className="text-xs text-brand-600 hover:text-brand-700">
          + Add another address
        </button>

        {/* Client Group */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Client Group</label>
          <select
            value={form.group_id || ''}
            onChange={(e) => update('group_id', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {clientGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Tax ID + Client Number */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tax ID (ABN)</label>
            <input
              value={form.tax_id || ''}
              onChange={(e) => update('tax_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Client Number</label>
            <input
              value={form.client_number || ''}
              onChange={(e) => update('client_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hourly Rate</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={form.hourly_rate || ''}
                onChange={(e) => update('hourly_rate', e.target.value)}
                className="w-full pl-7 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">/hr</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mileage Rate</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={form.mileage_rate || ''}
                onChange={(e) => update('mileage_rate', e.target.value)}
                className="w-full pl-7 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">/km</span>
            </div>
          </div>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => update('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Preview: {CURRENCY_SYMBOLS[form.currency]}12,718.65</p>
        </div>

        {/* Extra Fields */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500">Custom Fields</label>
          {[1, 2, 3].map((n) => (
            <input
              key={n}
              placeholder={`Extra Field ${n}`}
              value={form[`extra_field_${n}`] || ''}
              onChange={(e) => update(`extra_field_${n}`, e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => update('notes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md"
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
}
