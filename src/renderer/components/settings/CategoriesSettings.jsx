import React, { useState, useEffect, useRef } from 'react';
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

export default function CategoriesSettings() {
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const addInputRef = useRef(null);
  const editInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (adding && addInputRef.current) addInputRef.current.focus();
  }, [adding]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  async function loadCategories() {
    try {
      const cats = await window.api.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setCategories(reordered);

    await window.api.reorderCategories(reordered.map((c) => c.id));
  }

  async function handleAdd() {
    const name = newName.trim().toUpperCase();
    if (!name) { setAdding(false); return; }
    setError('');
    try {
      await window.api.saveCategory({ name });
      setNewName('');
      setAdding(false);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to add category');
    }
  }

  async function handleRename(id) {
    const name = editName.trim().toUpperCase();
    if (!name) { setEditingId(null); return; }
    setError('');
    try {
      await window.api.saveCategory({ id, name });
      setEditingId(null);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to rename category');
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    setError('');
    try {
      await window.api.deleteCategory(selectedId);
      setSelectedId(null);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Cannot delete: category is in use');
    }
  }

  function startEditing(cat) {
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Categories</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Categories group line items on invoices and estimates. Drag to reorder.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setAdding(true); setError(''); }}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded"
            title="Add category"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedId}
            className={`w-7 h-7 flex items-center justify-center rounded ${
              selectedId ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Delete selected category"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 text-xs text-red-600 bg-red-50 rounded-md border border-red-100">
          {error}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {categories.map((cat) => (
              <SortableCategoryRow
                key={cat.id}
                category={cat}
                isSelected={selectedId === cat.id}
                isEditing={editingId === cat.id}
                editName={editName}
                editInputRef={editingId === cat.id ? editInputRef : null}
                onSelect={() => setSelectedId(selectedId === cat.id ? null : cat.id)}
                onDoubleClick={() => startEditing(cat)}
                onEditNameChange={setEditName}
                onRename={() => handleRename(cat.id)}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add new category */}
        {adding && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border-t border-gray-200">
            <input
              ref={addInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
              onBlur={handleAdd}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Category name..."
            />
          </div>
        )}

        {categories.length === 0 && !adding && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No categories defined. Click + to add one.
          </div>
        )}
      </div>
    </div>
  );
}

function SortableCategoryRow({ category, isSelected, isEditing, editName, editInputRef, onSelect, onDoubleClick, onEditNameChange, onRename, onCancelEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={`flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer ${
        isSelected ? 'bg-brand-50 text-brand-900' : 'hover:bg-gray-50'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>

      {/* Name */}
      {isEditing ? (
        <input
          ref={editInputRef}
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRename();
            if (e.key === 'Escape') onCancelEdit();
          }}
          onBlur={onRename}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-2 py-0.5 text-sm border border-brand-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      ) : (
        <span className="flex-1 font-medium">{category.name}</span>
      )}
    </div>
  );
}
