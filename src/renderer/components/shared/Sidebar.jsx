import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function Sidebar({
  clientGroups,
  selectedClient,
  onSelectClient,
  onNavigate,
  currentView,
  onRefreshGroups,
  onAddClient,
  onEditClient,
}) {
  const [clientsByGroup, setClientsByGroup] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const groupInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadClients = useCallback(async () => {
    const grouped = {};
    for (const group of clientGroups) {
      try {
        const clients = await window.api.getClients(group.id);
        grouped[group.id] = clients;
      } catch {
        grouped[group.id] = [];
      }
    }
    setClientsByGroup(grouped);
  }, [clientGroups]);

  useEffect(() => {
    loadClients();
    const expanded = {};
    for (const group of clientGroups) {
      expanded[group.id] = expandedGroups[group.id] !== undefined ? expandedGroups[group.id] : true;
    }
    setExpandedGroups(expanded);
  }, [clientGroups]);

  // Reload clients when a client might have changed
  useEffect(() => {
    loadClients();
  }, [selectedClient?.id, selectedClient?.group_id]);

  useEffect(() => {
    if (addingGroup && groupInputRef.current) groupInputRef.current.focus();
  }, [addingGroup]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  function toggleGroup(groupId) {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = clientGroups.findIndex((g) => g.id === active.id);
    const newIndex = clientGroups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...clientGroups];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    await window.api.reorderClientGroups(reordered.map((g) => g.id));
    onRefreshGroups();
  }

  async function handleAddGroup() {
    const name = newGroupName.trim();
    if (!name) { setAddingGroup(false); return; }
    await window.api.saveClientGroup({ name });
    setNewGroupName('');
    setAddingGroup(false);
    onRefreshGroups();
  }

  function handleClientContextMenu(e, client) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, client });
  }

  async function handleMoveToGroup(client, groupId) {
    await window.api.moveClientToGroup(client.id, groupId);
    setContextMenu(null);
    onRefreshGroups();
  }

  async function handleArchiveClient(client) {
    await window.api.archiveClient(client.id);
    setContextMenu(null);
    if (selectedClient?.id === client.id) onSelectClient(null);
    onRefreshGroups();
  }

  function clientDisplayName(client) {
    if (client.is_company && client.company) return client.company;
    return [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Unnamed Client';
  }

  return (
    <aside className="w-[220px] min-w-[220px] bg-gray-50 border-r border-gray-200 flex flex-col h-full select-none">
      {/* Drag region for macOS traffic lights */}
      <div className="drag-region h-10 flex items-end px-4 pb-1">
        <span className="no-drag text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Clients
        </span>
      </div>

      {/* Client Groups + Client List (sortable) */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={clientGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            {clientGroups.map((group) => (
              <SortableGroup
                key={group.id}
                group={group}
                expanded={expandedGroups[group.id]}
                onToggle={() => toggleGroup(group.id)}
                clients={clientsByGroup[group.id] || []}
                selectedClient={selectedClient}
                onSelectClient={(client) => {
                  onSelectClient(client);
                  onNavigate('client');
                }}
                onContextMenu={handleClientContextMenu}
                onAddClient={() => onAddClient(group.id)}
                clientDisplayName={clientDisplayName}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add Group */}
        {addingGroup ? (
          <div className="px-2 py-1">
            <input
              ref={groupInputRef}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddGroup();
                if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName(''); }
              }}
              onBlur={handleAddGroup}
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-brand-500"
              placeholder="Group name..."
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingGroup(true)}
            className="w-full text-left px-4 py-1.5 text-xs text-gray-400 hover:text-brand-600"
          >
            + Add Group
          </button>
        )}
      </nav>

      {/* Navigation links */}
      <div className="border-t border-gray-200 px-2 py-2 space-y-0.5">
        <NavButton label="Dashboard" view="dashboard" currentView={currentView} onNavigate={onNavigate} />
        <NavButton label="All Slips" view="allslips" currentView={currentView} onNavigate={onNavigate} />
        <NavButton label="Unfiled Slips" view="unfiled" currentView={currentView} onNavigate={onNavigate} />
        <NavButton label="Approvals" view="approvals" currentView={currentView} onNavigate={onNavigate} />
        <NavButton label="Reports" view="reports" currentView={currentView} onNavigate={onNavigate} />
        <div className="border-t border-gray-100 my-1" />
        <NavButton label="Settings" view="settings" currentView={currentView} onNavigate={onNavigate} />
      </div>

      {/* User info */}
      <div className="border-t border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-400 truncate">Krull D+A</p>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          client={contextMenu.client}
          clientGroups={clientGroups}
          onMoveToGroup={handleMoveToGroup}
          onEdit={(client) => { setContextMenu(null); onEditClient(client); }}
          onArchive={handleArchiveClient}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>
  );
}

function SortableGroup({ group, expanded, onToggle, clients, selectedClient, onSelectClient, onContextMenu, onAddClient, clientDisplayName }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      {/* Group Header */}
      <div className="flex items-center">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
            <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
          </svg>
        </button>
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-1 px-1 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 rounded text-left"
        >
          <svg
            className={`w-3 h-3 transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="truncate">{group.name}</span>
        </button>
      </div>

      {/* Client List */}
      {expanded && (
        <div className="ml-5">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelectClient(client)}
              onContextMenu={(e) => onContextMenu(e, client)}
              className={`w-full text-left px-3 py-1.5 text-sm rounded-md truncate ${
                selectedClient?.id === client.id
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {clientDisplayName(client)}
            </button>
          ))}
          <button
            onClick={onAddClient}
            className="w-full text-left px-3 py-1 text-xs text-gray-400 hover:text-brand-600"
          >
            + Add Client
          </button>
        </div>
      )}
    </div>
  );
}

function ContextMenu({ x, y, client, clientGroups, onMoveToGroup, onEdit, onArchive, onClose }) {
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const menuRef = useRef(null);

  // Adjust position to stay on screen
  const style = {
    position: 'fixed',
    top: y,
    left: x,
    zIndex: 100,
  };

  return (
    <div ref={menuRef} style={style} className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
      <div
        className="relative"
        onMouseEnter={() => setShowMoveSubmenu(true)}
        onMouseLeave={() => setShowMoveSubmenu(false)}
      >
        <button className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between">
          Move to Group
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {showMoveSubmenu && (
          <div className="absolute left-full top-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
            {clientGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => onMoveToGroup(client, group.id)}
                className={`w-full text-left px-4 py-1.5 text-sm hover:bg-gray-100 ${
                  client.group_id === group.id ? 'text-brand-600 font-medium' : 'text-gray-700'
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => onEdit(client)}
        className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        Edit
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button
        onClick={() => onArchive(client)}
        className="w-full text-left px-4 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        Archive
      </button>
    </div>
  );
}

function NavButton({ label, view, currentView, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(view)}
      className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
        currentView === view ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}
