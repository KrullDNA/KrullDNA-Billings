import React, { useState, useEffect, useCallback } from 'react';
import ProjectForm from '../projects/ProjectForm';
import LineItemForm from '../lineitems/LineItemForm';

const CURRENCY_SYMBOLS = { AUD: '$', USD: '$', EUR: '\u20ac', GBP: '\u00a3', NZD: '$', CAD: '$', SGD: '$' };

function formatCurrency(amount, currency = 'AUD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${(amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export default function ClientView({ client }) {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [lineItemFilter, setLineItemFilter] = useState('working');
  const [summary, setSummary] = useState({ overdue: 0, totalBilled: 0, totalPaid: 0, balance: 0 });

  // Project form
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Line item form
  const [lineItemFormOpen, setLineItemFormOpen] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState(null);

  const loadProjects = useCallback(async () => {
    if (!client?.id) return;
    try {
      const p = await window.api.getProjects(client.id);
      setProjects(p);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, [client?.id]);

  const loadSummary = useCallback(async () => {
    if (!client?.id) return;
    try {
      const s = await window.api.getClientSummary(client.id);
      setSummary(s);
    } catch (err) {
      console.error('Failed to load client summary:', err);
    }
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
      const items = lineItemFilter === 'estimate'
        ? await window.api.getUnbilledLineItems(selectedProject.id)
        : await window.api.getLineItems(selectedProject.id);
      setLineItems(items);
    } catch (err) {
      console.error('Failed to load line items:', err);
    }
  }, [selectedProject?.id, lineItemFilter]);

  useEffect(() => {
    loadLineItems();
  }, [loadLineItems]);

  function handleProjectSaved() {
    loadProjects();
    setEditingProject(null);
  }

  function handleLineItemSaved() {
    loadLineItems();
    loadProjects(); // Refresh totals
    loadSummary();
  }

  function handleNewLineItem() {
    setEditingLineItem(null);
    setLineItemFormOpen(true);
  }

  function handleEditLineItem(item) {
    setEditingLineItem(item);
    setLineItemFormOpen(true);
  }

  const currency = client?.currency || 'AUD';

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 px-6">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'projects'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Projects
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'account'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Account
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'projects' && (
          <ProjectsTab
            client={client}
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            lineItems={lineItems}
            lineItemFilter={lineItemFilter}
            onSetLineItemFilter={setLineItemFilter}
            onNewProject={() => { setEditingProject(null); setProjectFormOpen(true); }}
            onEditProject={(p) => { setEditingProject(p); setProjectFormOpen(true); }}
            onNewLineItem={handleNewLineItem}
            onEditLineItem={handleEditLineItem}
            currency={currency}
          />
        )}
        {activeTab === 'account' && (
          <AccountTab client={client} summary={summary} currency={currency} />
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="h-8 min-h-[32px] bg-gray-50 border-t border-gray-200 flex items-center px-6 text-xs text-gray-500 gap-4">
        <span className="font-medium text-gray-700">
          {client.is_company ? client.company : `${client.first_name} ${client.last_name}`}
        </span>
        <span className="flex-1" />
        {summary.overdue > 0 && (
          <span className="text-red-600 font-medium">
            Overdue: {formatCurrency(summary.overdue, currency)}
          </span>
        )}
        <span>Total: {formatCurrency(summary.balance, currency)}</span>
      </div>

      {/* Project Form */}
      <ProjectForm
        open={projectFormOpen}
        onClose={() => setProjectFormOpen(false)}
        project={editingProject}
        clientId={client.id}
        onSaved={handleProjectSaved}
      />

      {/* Line Item Form */}
      <LineItemForm
        open={lineItemFormOpen}
        onClose={() => setLineItemFormOpen(false)}
        lineItem={editingLineItem}
        projectId={selectedProject?.id}
        currency={currency}
        onSaved={handleLineItemSaved}
      />
    </div>
  );
}

function ProjectsTab({ client, projects, selectedProject, onSelectProject, lineItems, lineItemFilter, onSetLineItemFilter, onNewProject, onEditProject, onNewLineItem, onEditLineItem, currency }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Area: Project List */}
      <div className="flex-shrink-0 border-b border-gray-200" style={{ maxHeight: '40%' }}>
        <div className="overflow-auto h-full">
          <div className="sticky top-0 bg-gray-50 grid grid-cols-[1fr_100px_80px_100px_100px] gap-2 px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
            <span>Project</span>
            <span className="text-right">Due Date</span>
            <span className="text-right">Time</span>
            <span className="text-right">Unbilled</span>
            <span className="text-right">Total</span>
          </div>

          {projects.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No projects yet. Click "New Project" to create one.
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project)}
                onDoubleClick={() => onEditProject(project)}
                className={`w-full grid grid-cols-[1fr_100px_80px_100px_100px] gap-2 px-6 py-2.5 text-sm text-left border-b border-gray-50 ${
                  selectedProject?.id === project.id
                    ? 'bg-brand-50 text-brand-900'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="truncate font-medium">{project.name}</span>
                <span className="text-right text-gray-500">
                  {project.due_date ? new Date(project.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '\u2014'}
                </span>
                <span className="text-right text-gray-500 tabular-nums">
                  {formatDuration(project.total_duration || 0)}
                </span>
                <span className="text-right text-gray-500 tabular-nums">
                  {formatCurrency(project.unbilled_total, currency)}
                </span>
                <span className="text-right font-medium tabular-nums">
                  {formatCurrency(project.line_items_total, currency)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bottom Area: Line Items Panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedProject ? (
          <>
            {/* Line Items Header */}
            <div className="flex items-center justify-between px-6 py-2 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSetLineItemFilter('estimate')}
                  className={`px-3 py-1 text-xs rounded-md ${
                    lineItemFilter === 'estimate'
                      ? 'bg-brand-100 text-brand-700 font-medium'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Estimate
                </button>
                <button
                  onClick={() => onSetLineItemFilter('working')}
                  className={`px-3 py-1 text-xs rounded-md ${
                    lineItemFilter === 'working'
                      ? 'bg-brand-100 text-brand-700 font-medium'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Working
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={onNewLineItem}
                  className="px-3 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-md font-medium"
                >
                  New Line Item
                </button>
                <button className="px-3 py-1 text-xs text-gray-300 rounded-md cursor-not-allowed" disabled title="Coming in a future session">
                  New from Blueprint
                </button>
                <button className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-md" disabled>
                  Start Working
                </button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="flex-1 overflow-auto">
              <div className="sticky top-0 bg-gray-50 grid grid-cols-[60px_1fr_90px_60px_80px_80px_28px] gap-2 px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <span>Kind</span>
                <span>Name</span>
                <span className="text-right">Date Due</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              {lineItems.length === 0 ? (
                <div className="px-6 py-6 text-center text-sm text-gray-400">
                  {lineItemFilter === 'estimate' ? 'No unbilled line items.' : 'No line items yet. Click "New Line Item" to add one.'}
                </div>
              ) : (
                lineItems.map((item) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    currency={currency}
                    onClick={() => onEditLineItem(item)}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a project to view its line items
          </div>
        )}
      </div>
    </div>
  );
}

function LineItemRow({ item, currency, onClick }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div
        className="grid grid-cols-[60px_1fr_90px_60px_80px_80px_28px] gap-2 px-6 py-2 text-sm border-b border-gray-50 hover:bg-gray-50 items-center cursor-pointer"
        onClick={onClick}
      >
        {/* Kind badge */}
        <span>
          <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${
            item.kind === 'hourly'
              ? 'bg-blue-100 text-blue-700'
              : item.kind === 'mileage'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {item.kind === 'hourly' ? 'Hourly' : item.kind === 'mileage' ? 'Mileage' : 'Fixed'}
          </span>
        </span>

        {/* Name + status */}
        <span className="flex items-center gap-2 truncate">
          {item.status === 'invoiced' ? (
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gray-300" />
          )}
          <span className="truncate">{item.name}</span>
          {item.status === 'invoiced' && (
            <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">DONE</span>
          )}
        </span>

        {/* Date Due */}
        <span className="text-right text-gray-500 text-xs">
          {item.date ? new Date(item.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '\u2014'}
        </span>

        {/* Quantity */}
        <span className="text-right tabular-nums text-gray-600">{item.quantity}</span>

        {/* Rate */}
        <span className="text-right tabular-nums text-gray-600">{formatCurrency(item.rate, currency)}</span>

        {/* Total */}
        <span className="text-right tabular-nums font-medium">{formatCurrency(item.total, currency)}</span>

        {/* Expand arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 grid grid-cols-2 gap-2">
          {item.category_name && (
            <div><span className="font-medium text-gray-600">Category:</span> {item.category_name}</div>
          )}
          <div><span className="font-medium text-gray-600">Billable:</span> {item.billable ? 'Yes' : 'No'}</div>
          {item.markup_pct > 0 && (
            <div><span className="font-medium text-gray-600">Markup:</span> {item.markup_pct}% ({formatCurrency(item.markup_amount, currency)})</div>
          )}
          {item.discount_pct > 0 && (
            <div><span className="font-medium text-gray-600">Discount:</span> {item.discount_pct}% ({formatCurrency(item.discount_amount, currency)})</div>
          )}
          {item.tax_name && (
            <div><span className="font-medium text-gray-600">Tax:</span> {item.tax_name} ({formatCurrency(item.tax_amount, currency)})</div>
          )}
          {item.notes && (
            <div className="col-span-2"><span className="font-medium text-gray-600">Notes:</span> {item.notes}</div>
          )}
        </div>
      )}
    </>
  );
}

function AccountTab({ client, summary, currency }) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-md space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Total Billed</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(summary.totalBilled, currency)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Total Paid</p>
            <p className="text-lg font-semibold text-green-600 tabular-nums">{formatCurrency(summary.totalPaid, currency)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Balance</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(summary.balance, currency)}</p>
          </div>
          <div className={`rounded-lg p-4 ${summary.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <p className="text-xs text-gray-500">Overdue</p>
            <p className={`text-lg font-semibold tabular-nums ${summary.overdue > 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(summary.overdue, currency)}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">Full invoice/payment history will be shown here in Session 4.</p>
      </div>
    </div>
  );
}
