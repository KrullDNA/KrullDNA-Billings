import React from 'react';

const CURRENCY_SYMBOLS = { AUD: '$', USD: 'US$', EUR: '\u20ac', GBP: '\u00a3', NZD: 'NZ$', CAD: 'CA$', SGD: 'S$' };

function formatCurrency(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaymentReceipt({ open, onClose, payment, businessName, currency }) {
  if (!open || !payment) return null;

  const clientName = payment.company || [payment.first_name, payment.last_name].filter(Boolean).join(' ') || 'Client';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Payment Receipt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Receipt body — monospace receipt style */}
        <div className="px-6 py-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 font-mono text-xs leading-relaxed text-gray-700">
            <p className="text-center font-bold text-sm mb-3">{businessName || 'Krull D+A'}</p>

            <p>Client: {clientName}</p>
            <p>Date: {payment.payment_date || 'N/A'}</p>
            <p>Method of Payment: {payment.method || 'N/A'}</p>

            <p className="my-2 border-t border-dashed border-gray-400" />

            <p className="font-bold">PAYMENT FOR INVOICES</p>
            {payment.invoice_number && (
              <div className="flex justify-between mt-1">
                <span>{payment.invoice_number}</span>
                <span>{formatCurrency(payment.amount, currency)}</span>
              </div>
            )}

            <p className="my-2 border-t border-dashed border-gray-400" />

            <div className="flex justify-between font-bold">
              <span>Total Tendered</span>
              <span>{formatCurrency(payment.amount, currency)}</span>
            </div>

            <p className="my-2 border-t border-dashed border-gray-400" />

            <p className="text-gray-500">{payment.notes || 'No Comments'}</p>

            <p className="text-center font-bold mt-4">HAVE A NICE DAY!</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Close</button>
          <button className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-md" disabled>Print Receipt</button>
        </div>
      </div>
    </div>
  );
}
