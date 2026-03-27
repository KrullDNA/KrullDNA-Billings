import React, { useState, useEffect, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ClientGroupsSettings() {
  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const addRef = useRef(null);
  const editRef = useRef(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { load(); }, []);
  useEffect(() => { if (adding && addRef.current) addRef.current.focus(); }, [adding]);
  useEffect(() => { if (editingId && editRef.current) editRef.current.focus(); }, [editingId]);

  async function load() {
    try { setGroups(await window.api.getClientGroups()); } catch (err) { console.error(err); }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    const reordered = [...groups];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setGroups(reordered);
    await window.api.reorderClientGroups(reordered.map((g) => g.id));
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) { setAdding(false); return; }
    setError('');
    try { await window.api.saveClientGroup({ name }); setNewName(''); setAdding(false); load(); }
    catch (err) { setError(err.message); }
  }

  async function handleRename(id) {
    const name = editName.trim();
    if (!name) { setEditingId(null); return; }
    try { await window.api.saveClientGroup({ id, name }); setEditingId(null); load(); }
    catch (err) { setError(err.message); }
  }

  async function handleDelete() {
    if (!selectedId) return;
    setError('');
    try { await window.api.deleteClientGroup(selectedId); setSelectedId(null); load(); }
    catch (err) { setError(err.message || 'Cannot delete group'); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Client Groups</h3>
          <p className="text-xs text-gray-500 mt-0.5">Sidebar groupings for organising clients. Drag to reorder.</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setAdding(true)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded" title="Add group">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
          <button onClick={handleDelete} disabled={!selectedId} className={`w-7 h-7 flex items-center justify-center rounded ${selectedId ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`} title="Delete">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
          </button>
        </div>
      </div>

      {error && <div className="mb-3 px-3 py-2 text-xs text-red-600 bg-red-50 rounded-md border border-red-100">{error}</div>}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            {groups.map((group) => (
              <SortableRow
                key={group.id}
                item={group}
                isSelected={selectedId === group.id}
                isEditing={editingId === group.id}
                editName={editName}
                editRef={editingId === group.id ? editRef : null}
                onSelect={() => setSelectedId(selectedId === group.id ? null : group.id)}
                onDoubleClick={() => { setEditingId(group.id); setEditName(group.name); }}
                onEditChange={setEditName}
                onRename={() => handleRename(group.id)}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {adding && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border-t border-gray-200">
            <input ref={addRef} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }} onBlur={handleAdd} className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Group name..." />
          </div>
        )}
        {groups.length === 0 && !adding && <div className="px-4 py-6 text-center text-sm text-gray-400">No groups.</div>}
      </div>
    </div>
  );
}

function SortableRow({ item, isSelected, isEditing, editName, editRef, onSelect, onDoubleClick, onEditChange, onRename, onCancelEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect} onDoubleClick={onDoubleClick} className={`flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer ${isSelected ? 'bg-brand-50 text-brand-900' : 'hover:bg-gray-50'}`}>
      <button {...attributes} {...listeners} className="p-0.5 text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" /><circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" /><circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" /></svg>
      </button>
      {isEditing ? (
        <input ref={editRef} value={editName} onChange={(e) => onEditChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onRename(); if (e.key === 'Escape') onCancelEdit(); }} onBlur={onRename} onClick={(e) => e.stopPropagation()} className="flex-1 px-2 py-0.5 text-sm border border-brand-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
      ) : (
        <span className="flex-1 font-medium">{item.name}</span>
      )}
    </div>
  );
}
