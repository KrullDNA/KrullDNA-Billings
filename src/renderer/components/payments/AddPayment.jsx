import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CURRENCY_SYMBOLS = { AUD: '$', USD: 'US$', EUR: '\u20ac', GBP: '\u00a3', NZD: 'NZ$', CAD: 'CA$', SGD: 'S$' };
function formatCurrency(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AddPayment({ open, onClose, client, invoice, currency, onSaved }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Electronic');
  const [methods, setMethods] = useState(['Electronic', 'Cash', 'Cheque', 'Credit Card', 'Bank Transfer']);
  const [paymentDate, setPaymentDate] = useState(localDate());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      // Load payment methods from settings
      window.api.getSettings().then((s) => {
        if (s.payment_methods) {
          try { setMethods(JSON.parse(s.payment_methods)); } catch { /* ignore */ }
        }
      }).catch(() => {});
      if (invoice) {
        const outstanding = (invoice.total || 0) - (invoice.paid_amount || 0);
        setAmount(outstanding > 0 ? outstanding.toFixed(2) : '');
      }
      setMethod('Electronic');
      setPaymentDate(localDate());
      setNotes('');
    }
  }, [open, invoice]);

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    try {
      await window.api.addPayment({
        client_id: client.id,
        invoice_id: invoice?.id || null,
        amount: amt,
        method,
        payment_date: paymentDate,
        notes: notes || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to add payment:', err);
    }
  }

  const clientName = client.is_company ? client.company : `${client.first_name} ${client.last_name}`;

  return (
    <Modal open={open} onClose={onClose} title="Add Payment">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="text-gray-600"><span className="font-medium">{clientName}</span></p>
          {invoice && (
            <p className="text-gray-500 text-xs mt-1">
              Invoice {invoice.invoice_number} — Total: {formatCurrency(invoice.total, currency)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{CURRENCY_SYMBOLS[currency] || '$'}</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500">
            {methods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Payment Date</label>
          <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-md">Add Payment</button>
        </div>
      </div>
    </Modal>
  );
}
