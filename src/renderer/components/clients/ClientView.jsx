import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProjectForm from '../projects/ProjectForm';
import LineItemForm from '../lineitems/LineItemForm';
import InvoiceModal from '../invoices/InvoiceModal';
import EstimateModal from '../estimates/EstimateModal';
import StatementModal from '../statements/StatementModal';
import AddPayment from '../payments/AddPayment';
import PaymentReceipt from '../payments/PaymentReceipt';

const CURRENCY_SYMBOLS = { AUD: '$', USD: 'US$', EUR: '\u20ac', GBP: '\u00a3', NZD: 'NZ$', CAD: 'CA$', SGD: 'S$' };

function formatCurrency(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function statusBadge(status) {
  const styles = {
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-400',
    approved: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-amber-100 text-amber-700',
  };
  return styles[status] || 'bg-gray-100 text-gray-600';
}

export default function ClientView({ client, newProjectRequested }) {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [lineItemFilter, setLineItemFilter] = useState('working');
  const [summary, setSummary] = useState({ overdue: 0, totalBilled: 0, totalPaid: 0, balance: 0 });

  // Modals
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Open project form when toolbar "New Project" is clicked
  useEffect(() => {
    if (newProjectRequested) {
      setEditingProject(null);
      setProjectFormOpen(true);
    }
  }, [newProjectRequested]);
  const [lineItemFormOpen, setLineItemFormOpen] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [estimateModalOpen, setEstimateModalOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!client?.id) return;
    try { setProjects(await window.api.getProjects(client.id)); } catch (err) { console.error(err); }
  }, [client?.id]);

  const loadSummary = useCallback(async () => {
    if (!client?.id) return;
    try { setSummary(await window.api.getClientSummary(client.id)); } catch (err) { console.error(err); }
  }, [client?.id]);

  useEffect(() => {
    loadProjects();
    loadSummary();
    setSelectedProject(null);
    setLineItems([]);
    setActiveTab('projects');
  }, [client?.id]);

  const loadLineItems = useCallback(async () => {
    if (!selectedProject?.id) { setLineItems([]); return; }
    try {
      const items = await window.api.getLineItems(selectedProject.id);
      setLineItems(items);
    } catch (err) { console.error(err); }
  }, [selectedProject?.id]);

  useEffect(() => { loadLineItems(); }, [loadLineItems]);

  function refreshAll() { loadLineItems(); loadProjects(); loadSummary(); }

  const currency = client?.currency || 'AUD';

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 px-6">
        <TabButton label="Projects" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
        <TabButton label="Account" active={activeTab === 'account'} onClick={() => setActiveTab('account')} />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'projects' && (
          <ProjectsTab
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            lineItems={lineItems}
            lineItemFilter={lineItemFilter}
            onSetLineItemFilter={setLineItemFilter}
            onNewProject={() => { setEditingProject(null); setProjectFormOpen(true); }}
            onEditProject={(p) => { setEditingProject(p); setProjectFormOpen(true); }}
            onNewLineItem={() => { setEditingLineItem(null); setLineItemFormOpen(true); }}
            onEditLineItem={(item) => { setEditingLineItem(item); setLineItemFormOpen(true); }}
            onSendInvoice={() => setInvoiceModalOpen(true)}
            onSendEstimate={() => setEstimateModalOpen(true)}
            currency={currency}
            onReorderLineItems={async (orderedIds) => {
              await window.api.reorderLineItems(orderedIds);
              loadLineItems();
            }}
            onRefresh={refreshAll}
          />
        )}
        {activeTab === 'account' && (
          <AccountTab client={client} currency={currency} onRefresh={refreshAll} />
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="h-8 min-h-[32px] bg-gray-50 border-t border-gray-200 flex items-center px-6 text-xs text-gray-500 gap-4">
        <span className="font-medium text-gray-700">
          {client.is_company ? client.company : `${client.first_name} ${client.last_name}`}
        </span>
        <span className="flex-1" />
        {summary.overdue > 0 && <span className="text-red-600 font-medium">Overdue: {formatCurrency(summary.overdue, currency)}</span>}
        <span>Total: {formatCurrency(summary.balance, currency)}</span>
      </div>

      {/* Modals */}
      <ProjectForm open={projectFormOpen} onClose={() => setProjectFormOpen(false)} project={editingProject} clientId={client.id} onSaved={() => { loadProjects(); setEditingProject(null); }} />
      <LineItemForm open={lineItemFormOpen} onClose={() => setLineItemFormOpen(false)} lineItem={editingLineItem} projectId={selectedProject?.id} currency={currency} onSaved={refreshAll} />
      <InvoiceModal open={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} client={client} project={selectedProject} onCreated={refreshAll} />
      <EstimateModal open={estimateModalOpen} onClose={() => setEstimateModalOpen(false)} client={client} project={selectedProject} onCreated={refreshAll} />
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      {label}
    </button>
  );
}

// ── Projects Tab ──

function ProjectsTab({ projects, selectedProject, onSelectProject, lineItems, lineItemFilter, onSetLineItemFilter, onNewProject, onEditProject, onNewLineItem, onEditLineItem, onSendInvoice, onSendEstimate, currency, onReorderLineItems, onRefresh }) {
  const unbilledItems = lineItems.filter((i) => i.status === 'unbilled');
  const estimateItems = lineItems.filter((i) => i.status === 'unbilled' || i.status === 'invoiced');
  const workingItems = lineItems.filter((i) => i.status === 'working' || i.status === 'invoiced');
  const displayItems = lineItemFilter === 'estimate' ? estimateItems : workingItems;
  const hasEstimateItems = unbilledItems.length > 0;
  const hasWorkingItems = workingItems.length > 0;
  const [lineItemContextMenu, setLineItemContextMenu] = useState(null);

  async function handleStartWorking(item) {
    try {
      await window.api.duplicateLineItem(item.id, { status: 'working' });
      onSetLineItemFilter('working');
      onRefresh();
    } catch (err) { console.error(err); }
  }

  async function handleDuplicateLineItem(item) {
    setLineItemContextMenu(null);
    try {
      await window.api.duplicateLineItem(item.id, {});
      onRefresh();
    } catch (err) { console.error(err); }
  }

  function handleLineItemContextMenu(e, item) {
    e.preventDefault();
    e.stopPropagation();
    setLineItemContextMenu({ x: e.clientX, y: e.clientY, item });
  }

  useEffect(() => {
    if (!lineItemContextMenu) return;
    const close = () => setLineItemContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [lineItemContextMenu]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Project List */}
      <div className="flex-shrink-0 border-b border-gray-200" style={{ maxHeight: '40%' }}>
        <div className="overflow-auto h-full">
          <div className="sticky top-0 bg-gray-50 grid grid-cols-[1fr_100px_80px_100px_100px] gap-2 px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
            <span>Project</span><span className="text-right">Due Date</span><span className="text-right">Time</span><span className="text-right">Unbilled</span><span className="text-right">Total</span>
          </div>
          {projects.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No projects yet. Click "New Project" to create one.</div>
          ) : projects.map((project) => (
            <button key={project.id} onClick={() => onSelectProject(project)} onDoubleClick={() => onEditProject(project)}
              className={`w-full grid grid-cols-[1fr_100px_80px_100px_100px] gap-2 px-6 py-2.5 text-sm text-left border-b border-gray-50 ${selectedProject?.id === project.id ? 'bg-brand-50 text-brand-900' : 'hover:bg-gray-50'}`}>
              <span className="truncate font-medium">{project.name}</span>
              <span className="text-right text-gray-500">{project.due_date ? new Date(project.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '\u2014'}</span>
              <span className="text-right text-gray-500 tabular-nums">{formatDuration(project.total_duration || 0)}</span>
              <span className="text-right text-gray-500 tabular-nums">{formatCurrency(project.unbilled_total, currency)}</span>
              <span className="text-right font-medium tabular-nums">{formatCurrency(project.line_items_total || project.invoiced_total || project.estimated_total || 0, currency)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Line Items Panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedProject ? (
          <>
            <div className="flex items-center justify-between px-6 py-2 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1">
                <button onClick={() => onSetLineItemFilter('estimate')} className={`px-3 py-1 text-xs rounded-md ${lineItemFilter === 'estimate' ? 'bg-brand-100 text-brand-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>Estimate</button>
                <button onClick={() => onSetLineItemFilter('working')} className={`px-3 py-1 text-xs rounded-md ${lineItemFilter === 'working' ? 'bg-brand-100 text-brand-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>Working</button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={onNewLineItem} className="px-3 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-md font-medium">New Line Item</button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                {lineItemFilter === 'estimate' ? (
                  <button onClick={onSendEstimate} disabled={!hasEstimateItems} className={`px-3 py-1 text-xs rounded-md font-medium ${hasEstimateItems ? 'text-white bg-brand-600 hover:bg-brand-700' : 'text-gray-300 bg-gray-100 cursor-not-allowed'}`}>Create Estimate</button>
                ) : (
                  <button onClick={onSendInvoice} disabled={!hasWorkingItems} className={`px-3 py-1 text-xs rounded-md font-medium ${hasWorkingItems ? 'text-white bg-brand-600 hover:bg-brand-700' : 'text-gray-300 bg-gray-100 cursor-not-allowed'}`}>Create Invoice</button>
                )}
              </div>
            </div>

            <SortableLineItemList
              displayItems={displayItems}
              currency={currency}
              lineItemFilter={lineItemFilter}
              onEditLineItem={onEditLineItem}
              handleStartWorking={handleStartWorking}
              onReorderLineItems={onReorderLineItems}
              onContextMenu={handleLineItemContextMenu}
            />

            {/* Line Item Context Menu */}
            {lineItemContextMenu && (
              <div
                className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px]"
                style={{ left: lineItemContextMenu.x, top: lineItemContextMenu.y }}
              >
                <button onClick={() => handleDuplicateLineItem(lineItemContextMenu.item)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Duplicate Line Item</button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Select a project to view its line items</div>
        )}
      </div>
    </div>
  );
}

function SortableLineItemList({ displayItems, currency, lineItemFilter, onEditLineItem, handleStartWorking, onReorderLineItems, onContextMenu }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = displayItems.findIndex((i) => i.id === active.id);
    const newIndex = displayItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(displayItems, oldIndex, newIndex);
    onReorderLineItems(reordered.map((i) => i.id));
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="sticky top-0 bg-gray-50 grid grid-cols-[20px_60px_1fr_90px_60px_80px_80px_100px_28px] gap-2 px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
        <span /><span>Kind</span><span>Name</span><span className="text-right">Date Due</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Total</span><span /><span />
      </div>
      {displayItems.length === 0 ? (
        <div className="px-6 py-6 text-center text-sm text-gray-400">{lineItemFilter === 'estimate' ? 'No estimate line items.' : 'No working line items. Click "Start Working" on an estimate item.'}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {displayItems.map((item) => (
              <SortableLineItemRow
                key={item.id}
                item={item}
                currency={currency}
                onClick={() => onEditLineItem(item)}
                showStartWorking={lineItemFilter === 'estimate'}
                onStartWorking={() => handleStartWorking(item)}
                onContextMenu={onContextMenu}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableLineItemRow(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <LineItemRow {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function LineItemRow({ item, currency, onClick, showStartWorking, onStartWorking, dragHandleProps, onContextMenu }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div className="grid grid-cols-[20px_60px_1fr_90px_60px_80px_80px_100px_28px] gap-2 px-6 py-2 text-sm border-b border-gray-50 hover:bg-gray-50 items-center cursor-pointer" onClick={onClick} onContextMenu={(e) => onContextMenu?.(e, item)}>
        <span className="flex items-center justify-center cursor-grab text-gray-300 hover:text-gray-500" onClick={(e) => e.stopPropagation()} {...dragHandleProps}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></svg>
        </span>
        <span>
          <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${item.kind === 'hourly' ? 'bg-blue-100 text-blue-700' : item.kind === 'mileage' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
            {item.kind === 'hourly' ? 'Hourly' : item.kind === 'mileage' ? 'Mileage' : 'Fixed'}
          </span>
        </span>
        <span className="flex items-center gap-2 truncate">
          {item.status === 'invoiced' ? (
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </span>
          ) : <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gray-300" />}
          <span className="truncate">{item.name}</span>
          {item.status === 'invoiced' && <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">DONE</span>}
        </span>
        <span className="text-right text-gray-500 text-xs">{item.date ? new Date(item.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '\u2014'}</span>
        <span className="text-right tabular-nums text-gray-600">{item.quantity}</span>
        <span className="text-right tabular-nums text-gray-600">{formatCurrency(item.rate, currency)}</span>
        <span className="text-right tabular-nums font-medium">{formatCurrency(item.total, currency)}</span>
        <span className="flex items-center justify-center">
          {showStartWorking && (
            <button onClick={(e) => { e.stopPropagation(); onStartWorking?.(); }} className="px-2 py-0.5 text-[10px] text-brand-600 bg-brand-50 hover:bg-brand-100 rounded font-medium whitespace-nowrap">Start Working</button>
          )}
        </span>
        <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="text-gray-400 hover:text-gray-600">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      {expanded && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 grid grid-cols-2 gap-2">
          {item.category_name && <div><span className="font-medium text-gray-600">Category:</span> {item.category_name}</div>}
          <div><span className="font-medium text-gray-600">Billable:</span> {item.billable ? 'Yes' : 'No'}</div>
          {item.markup_pct > 0 && <div><span className="font-medium text-gray-600">Markup:</span> {item.markup_pct}%</div>}
          {item.discount_pct > 0 && <div><span className="font-medium text-gray-600">Discount:</span> {item.discount_pct}%</div>}
          {item.tax_name && <div><span className="font-medium text-gray-600">Tax:</span> {item.tax_name}</div>}
          {item.notes && <div className="col-span-2"><span className="font-medium text-gray-600">Notes:</span> {item.notes}</div>}
        </div>
      )}
    </>
  );
}

// ── Account Tab ──

function AccountTab({ client, currency, onRefresh }) {
  const [invoices, setInvoices] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // { type, data }
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [settings, setSettings] = useState({});
  const [contextMenu, setContextMenu] = useState(null); // { x, y, tx }

  const loadAccountData = useCallback(async () => {
    if (!client?.id) return;
    try {
      const [inv, est, pay, stngs] = await Promise.all([
        window.api.getInvoices(client.id),
        window.api.getEstimates(client.id),
        window.api.getPayments(client.id),
        window.api.getSettings(),
      ]);
      setInvoices(inv);
      setEstimates(est);
      setPayments(pay);
      setSettings(stngs);
    } catch (err) { console.error(err); }
  }, [client?.id]);

  useEffect(() => { loadAccountData(); }, [loadAccountData]);

  // Build unified transaction list sorted by date desc
  const transactions = [
    ...invoices.map((i) => ({ type: 'invoice', data: i, date: i.invoice_date || i.created_at, number: i.invoice_number, amount: i.total, status: i.status })),
    ...estimates.map((e) => ({ type: 'estimate', data: e, date: e.estimate_date || e.created_at, number: e.estimate_number, amount: e.total, status: e.status })),
    ...payments.map((p) => ({ type: 'payment', data: p, date: p.payment_date || p.created_at, number: p.invoice_number ? `Payment for ${p.invoice_number}` : 'Payment', amount: p.amount, status: 'paid' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const retainerBalance = client.retainer_balance || 0;
  const totalBilled = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const accountBalance = totalBilled - totalPaid;

  function handleAddPayment(invoice) {
    setPaymentInvoice(invoice || null);
    setPaymentModalOpen(true);
  }

  async function handlePaymentSaved() {
    await loadAccountData();
    onRefresh();
  }

  async function handleShowReceipt(payment) {
    try {
      const receipt = await window.api.getPaymentReceipt(payment.id);
      setReceiptData(receipt);
      setReceiptOpen(true);
    } catch (err) { console.error(err); }
  }

  function handleContextMenu(e, tx) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tx });
  }

  async function handleDeleteDoc(tx) {
    setContextMenu(null);
    const label = tx.type === 'invoice' ? `Invoice ${tx.number}` : `Estimate ${tx.number}`;
    if (!confirm(`Delete ${label}?`)) return;
    try {
      if (tx.type === 'invoice') await window.api.deleteInvoice(tx.data.id);
      else await window.api.deleteEstimate(tx.data.id);
      if (selectedItem?.data.id === tx.data.id) setSelectedItem(null);
      await loadAccountData();
      onRefresh();
    } catch (err) { console.error(err); }
  }

  async function handleDeleteAndRestore(tx) {
    setContextMenu(null);
    const label = tx.type === 'invoice' ? `Invoice ${tx.number}` : `Estimate ${tx.number}`;
    if (!confirm(`Delete ${label} and restore its line items back to unbilled?`)) return;
    try {
      if (tx.type === 'invoice') await window.api.deleteInvoiceAndRestore(tx.data.id);
      else await window.api.deleteEstimateAndRestore(tx.data.id);
      if (selectedItem?.data.id === tx.data.id) setSelectedItem(null);
      await loadAccountData();
      onRefresh();
    } catch (err) { console.error(err); }
  }

  async function handleDeletePayment(tx) {
    setContextMenu(null);
    if (!confirm('Delete this payment? The linked invoice status will be recalculated.')) return;
    try {
      await window.api.deletePayment(tx.data.id);
      if (selectedItem?.type === 'payment' && selectedItem?.data.id === tx.data.id) setSelectedItem(null);
      await loadAccountData();
      onRefresh();
    } catch (err) { console.error(err); }
  }

  async function handleRegeneratePdf(tx) {
    setContextMenu(null);
    try {
      await window.api.generatePdf(tx.type, tx.data.id);
    } catch (err) { console.error(err); }
  }

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel: Transaction List */}
      <div className="w-[380px] min-w-[320px] border-r border-gray-200 flex flex-col">
        <div className="flex-1 overflow-auto">
          {transactions.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No transactions yet.</div>
          ) : transactions.map((tx, i) => (
            <button
              key={`${tx.type}-${tx.data.id}-${i}`}
              onClick={() => setSelectedItem(tx)}
              onContextMenu={(e) => handleContextMenu(e, tx)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 text-sm ${
                selectedItem?.type === tx.type && selectedItem?.data.id === tx.data.id
                  ? 'bg-brand-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    tx.type === 'invoice' ? 'bg-blue-50 text-blue-600'
                    : tx.type === 'estimate' ? 'bg-purple-50 text-purple-600'
                    : 'bg-green-50 text-green-600'
                  }`}>
                    {tx.type === 'invoice' ? 'INV' : tx.type === 'estimate' ? 'EST' : 'PAY'}
                  </span>
                  <span className="font-medium truncate">{tx.number}</span>
                </div>
                {tx.status !== 'draft' && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusBadge(tx.status)}`}>
                    {tx.status?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">{tx.date ? new Date(tx.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                <span className={`tabular-nums font-medium ${tx.type === 'payment' ? 'text-green-600' : ''}`}>
                  {tx.type === 'payment' ? '-' : ''}{formatCurrency(tx.amount, currency)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          <div className="flex gap-2">
            <button onClick={() => handleAddPayment(selectedItem?.type === 'invoice' ? selectedItem.data : null)} className="flex-1 px-3 py-1.5 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded-md font-medium">Add Payment</button>
            <button onClick={() => setStatementModalOpen(true)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md border border-gray-200">Send Statement</button>
          </div>
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>Retainer: {formatCurrency(retainerBalance, currency)}</span>
            <span className="font-medium text-gray-700">Balance: {formatCurrency(accountBalance, currency)}</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Detail View */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {selectedItem ? (
          <DetailPanel item={selectedItem} currency={currency} settings={settings} onShowReceipt={handleShowReceipt} onAddPayment={handleAddPayment} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">Select a transaction to view details</div>
        )}
      </div>

      {/* Modals */}
      <AddPayment
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        client={client}
        invoice={paymentInvoice}
        currency={currency}
        onSaved={handlePaymentSaved}
      />
      <PaymentReceipt
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        payment={receiptData}
        businessName={settings.business_name}
        currency={currency}
      />

      <StatementModal
        open={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
        client={client}
        onCreated={async () => { await loadAccountData(); onRefresh(); }}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.tx.type === 'invoice' && (
            <>
              <button onClick={() => handleDeleteDoc(contextMenu.tx)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Delete Invoice</button>
              <button onClick={() => handleDeleteAndRestore(contextMenu.tx)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Delete and Restore Line Items</button>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => handleRegeneratePdf(contextMenu.tx)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Regenerate PDF</button>
            </>
          )}
          {contextMenu.tx.type === 'estimate' && (
            <>
              <button onClick={() => handleDeleteDoc(contextMenu.tx)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Delete Estimate</button>
              <button onClick={() => handleDeleteAndRestore(contextMenu.tx)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Delete and Restore Line Items</button>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => handleRegeneratePdf(contextMenu.tx)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Regenerate PDF</button>
            </>
          )}
          {contextMenu.tx.type === 'payment' && (
            <>
            <button onClick={() => { setContextMenu(null); handleShowReceipt(contextMenu.tx.data); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">View Receipt</button>
            <button onClick={() => handleDeletePayment(contextMenu.tx)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">Delete Payment</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DetailPanel({ item, currency, settings, onShowReceipt, onAddPayment }) {
  const { type } = item;

  if (type === 'payment') {
    return <PaymentDetail data={item.data} currency={currency} onShowReceipt={onShowReceipt} />;
  }

  return <DocumentDetail item={item} currency={currency} settings={settings} onAddPayment={onAddPayment} />;
}

function PaymentDetail({ data, currency, onShowReceipt }) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-medium text-green-600">{formatCurrency(data.amount, currency)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Method</span><span>{data.method || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{data.payment_date}</span></div>
          {data.invoice_number && <div className="flex justify-between"><span className="text-gray-500">Invoice</span><span>{data.invoice_number}</span></div>}
          {data.notes && <div className="flex justify-between"><span className="text-gray-500">Notes</span><span>{data.notes}</span></div>}
        </div>
        <button onClick={() => onShowReceipt(data)} className="mt-4 px-4 py-2 text-xs text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 w-full">View Receipt</button>
      </div>
    </div>
  );
}

function DocumentDetail({ item, currency, settings, onAddPayment }) {
  const { type, data } = item;
  const isInvoice = type === 'invoice';
  const [pdfHtml, setPdfHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      try {
        const html = await window.api.generatePdfHtml(type, data.id);
        if (!cancelled) setPdfHtml(html);
      } catch (err) { console.error(err); }
    }
    loadPreview();
    return () => { cancelled = true; };
  }, [data.id, type]);

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      {/* PDF Preview */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden" style={{ width: 595, height: 842 }}>
        {pdfHtml ? (
          <iframe
            srcDoc={pdfHtml}
            style={{ width: 595, height: 842, border: 'none' }}
            title="Document preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading preview...</div>
        )}
      </div>

      {/* Action button */}
      {isInvoice && data.status !== 'paid' && data.status !== 'cancelled' && (
        <button onClick={() => onAddPayment(data)} className="px-4 py-2 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded-md">Record Payment</button>
      )}
    </div>
  );
}
