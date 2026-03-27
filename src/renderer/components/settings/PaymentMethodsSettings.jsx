import React, { useState, useEffect, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function PaymentMethodsSettings() {
  const [methods, setMethods] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editName, setEditName] = useState('');
  const addRef = useRef(null);
  const editRef = useRef(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { load(); }, []);
  useEffect(() => { if (adding && addRef.current) addRef.current.focus(); }, [adding]);
  useEffect(() => { if (editingIdx !== null && editRef.current) editRef.current.focus(); }, [editingIdx]);

  async function load() {
    try {
      const settings = await window.api.getSettings();
      const list = settings.payment_methods ? JSON.parse(settings.payment_methods) : ['Electronic', 'Cash', 'Cheque', 'Credit Card', 'Bank Transfer'];
      setMethods(list);
    } catch (err) { console.error(err); }
  }

  async function persist(list) {
    setMethods(list);
    await window.api.saveSetting('payment_methods', JSON.stringify(list));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = parseInt(active.id);
    const newIdx = parseInt(over.id);
    const reordered = [...methods];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    persist(reordered);
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) { setAdding(false); return; }
    persist([...methods, name]);
    setNewName('');
    setAdding(false);
  }

  function handleRename(idx) {
    const name = editName.trim();
    if (!name) { setEditingIdx(null); return; }
    const updated = [...methods];
    updated[idx] = name;
    persist(updated);
    setEditingIdx(null);
  }

  function handleDelete(idx) {
    persist(methods.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Payment Methods</h3>
          <p className="text-xs text-gray-500 mt-0.5">Options shown in the Add Payment modal.</p>
        </div>
        <button onClick={() => setAdding(true)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={methods.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
            {methods.map((method, idx) => (
              <SortableMethodRow
                key={`${idx}-${method}`}
                id={String(idx)}
                name={method}
                isEditing={editingIdx === idx}
                editName={editName}
                editRef={editingIdx === idx ? editRef : null}
                onDoubleClick={() => { setEditingIdx(idx); setEditName(method); }}
                onEditChange={setEditName}
                onRename={() => handleRename(idx)}
                onCancelEdit={() => setEditingIdx(null)}
                onDelete={() => handleDelete(idx)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {adding && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border-t border-gray-200">
            <input ref={addRef} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }} onBlur={handleAdd} className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Method name..." />
          </div>
        )}
        {methods.length === 0 && !adding && <div className="px-4 py-6 text-center text-sm text-gray-400">No payment methods.</div>}
      </div>
    </div>
  );
}

function SortableMethodRow({ id, name, isEditing, editName, editRef, onDoubleClick, onEditChange, onRename, onCancelEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} onDoubleClick={onDoubleClick} className="flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50 group">
      <button {...attributes} {...listeners} className="p-0.5 text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0">
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" /><circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" /><circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" /></svg>
      </button>
      {isEditing ? (
        <input ref={editRef} value={editName} onChange={(e) => onEditChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onRename(); if (e.key === 'Escape') onCancelEdit(); }} onBlur={onRename} className="flex-1 px-2 py-0.5 text-sm border border-brand-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
      ) : (
        <span className="flex-1 font-medium">{name}</span>
      )}
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
