import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BLOCK_TYPES, createBlock } from './blocks/blockDefs';
import { renderBlock } from './blocks/BlockRenderers';
import BlockProperties from './BlockProperties';

export default function Builder({ blocks, onChange, data, onSaveTemplate, onLoadTemplate, templateName }) {
  const [selectedId, setSelectedId] = useState(null);
  const [draggedType, setDraggedType] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;

  function handleBlockChange(updated) {
    onChange(blocks.map((b) => b.id === updated.id ? updated : b));
  }

  function handleDelete(id) {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleDragStart(event) {
    const { active } = event;
    // Check if dragging from library
    if (active.id.startsWith('lib_')) {
      setDraggedType(active.id.replace('lib_', ''));
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setDraggedType(null);

    if (!over) return;

    // Drag from library to canvas
    if (active.id.startsWith('lib_')) {
      const type = active.id.replace('lib_', '');
      const newBlock = createBlock(type);

      // Insert at position
      const overIndex = blocks.findIndex((b) => b.id === over.id);
      if (overIndex >= 0) {
        const updated = [...blocks];
        updated.splice(overIndex, 0, newBlock);
        onChange(updated);
      } else {
        onChange([...blocks, newBlock]);
      }
      setSelectedId(newBlock.id);
      return;
    }

    // Reorder within canvas
    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const updated = [...blocks];
        const [moved] = updated.splice(oldIndex, 1);
        updated.splice(newIndex, 0, moved);
        onChange(updated);
      }
    }
  }

  return (
    <div className="flex h-full bg-gray-100">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Left: Block Library */}
        <div className="w-[200px] min-w-[200px] bg-white border-r border-gray-200 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-100">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Blocks</h3>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {BLOCK_TYPES.map((bt) => (
              <LibraryItem key={bt.type} blockType={bt} />
            ))}
          </div>

          {/* Template actions */}
          <div className="border-t border-gray-200 p-2 space-y-1">
            {onSaveTemplate && (
              <button onClick={onSaveTemplate} className="w-full px-3 py-1.5 text-xs text-brand-600 hover:bg-brand-50 rounded border border-brand-200 font-medium">Save as Template</button>
            )}
            {onLoadTemplate && (
              <button onClick={onLoadTemplate} className="w-full px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded border border-gray-200">Load Template</button>
            )}
          </div>
        </div>

        {/* Centre: A4 Canvas */}
        <div className="flex-1 overflow-auto p-6 flex justify-center">
          <div className="w-[595px] min-h-[842px] bg-white shadow-lg border border-gray-200 flex flex-col" style={{ fontFamily: "'Gotham', 'Gotham Rounded', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11 }}>
            {/* Main content area */}
            <div className="flex-1 p-8">
              <SortableContext items={blocks.filter((b) => b.type !== 'footer_block').map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.filter((b) => b.type !== 'footer_block').map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    data={data}
                    isSelected={selectedId === block.id}
                    onSelect={() => setSelectedId(block.id)}
                    onDelete={() => handleDelete(block.id)}
                  />
                ))}
              </SortableContext>

              {blocks.filter((b) => b.type !== 'footer_block').length === 0 && (
                <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded text-sm text-gray-400">
                  Drag blocks from the library to start building
                </div>
              )}
            </div>

            {/* Footer zone — always at bottom of page */}
            <div className="border-t-2 border-dashed border-gray-200 p-8 bg-gray-50/50">
              {blocks.filter((b) => b.type === 'footer_block').length > 0 ? (
                blocks.filter((b) => b.type === 'footer_block').map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    data={data}
                    isSelected={selectedId === block.id}
                    onSelect={() => setSelectedId(block.id)}
                    onDelete={() => handleDelete(block.id)}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-300 rounded text-xs text-gray-400">
                  Footer zone — drag a Footer block here (always bottom of PDF)
                </div>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {draggedType && (
            <div className="bg-brand-50 border border-brand-300 rounded px-3 py-2 text-xs text-brand-700 shadow-lg opacity-80">
              {BLOCK_TYPES.find((bt) => bt.type === draggedType)?.label || draggedType}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Right: Properties */}
      <div className="w-[250px] min-w-[250px] bg-white border-l border-gray-200 overflow-auto">
        <div className="px-3 py-2 border-b border-gray-100">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Properties</h3>
        </div>
        <BlockProperties block={selectedBlock} onChange={handleBlockChange} />
      </div>
    </div>
  );
}

// ── Library drag item ──

function LibraryItem({ blockType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `lib_${blockType.type}`,
    data: { type: 'library', blockType: blockType.type },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-grab hover:bg-gray-50 border border-transparent hover:border-gray-200 ${isDragging ? 'opacity-50' : ''}`}
    >
      <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">{blockType.icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">{blockType.label}</p>
        <p className="text-[10px] text-gray-400 truncate">{blockType.desc}</p>
      </div>
    </div>
  );
}

// ── Sortable block on canvas ──

function SortableBlock({ block, data, isSelected, onSelect, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`relative group ${isSelected ? 'ring-2 ring-brand-500 ring-offset-1 rounded' : ''}`}
    >
      {/* Drag handle + delete */}
      <div className="absolute -left-6 top-0 bottom-0 flex flex-col items-center justify-start pt-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 text-gray-300 hover:text-gray-500 cursor-grab"
          title="Drag to reorder"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
            <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
          </svg>
        </button>
      </div>

      <div className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 text-gray-300 hover:text-red-500" title="Delete block">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Block content */}
      {renderBlock(block, data)}
    </div>
  );
}

// ── Standalone document renderer (non-interactive, for previews) ──

export function DocumentRenderer({ blocks, data }) {
  const headerBlocks = blocks.filter((b) => b.type === 'header_block');
  const bodyBlocks = blocks.filter((b) => b.type !== 'header_block' && b.type !== 'footer_block' && b.type !== 'totals_block' && b.type !== 'spacer_block');
  const totalsBlocks = blocks.filter((b) => b.type === 'totals_block');
  const footerBlocks = blocks.filter((b) => b.type === 'footer_block');

  return (
    <div className="bg-white flex flex-col" style={{ width: 595, minHeight: 842, fontFamily: "'Gotham', 'Gotham Rounded', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11 }}>
      {/* Header */}
      <div style={{ padding: '30px 30px 20px 30px' }}>
        {headerBlocks.map((block) => (
          <div key={block.id}>{renderBlock(block, data)}</div>
        ))}
      </div>
      {/* Body — line items table */}
      <div style={{ padding: '0 30px' }}>
        {bodyBlocks.map((block) => (
          <div key={block.id}>{renderBlock(block, data)}</div>
        ))}
      </div>
      {/* Totals + Footer */}
      <div className="mt-auto" style={{ padding: '0 30px 30px 30px' }}>
        {totalsBlocks.map((block) => (
          <div key={block.id}>{renderBlock(block, data)}</div>
        ))}
        {footerBlocks.map((block) => (
          <div key={block.id}>{renderBlock(block, data)}</div>
        ))}
      </div>
    </div>
  );
}
