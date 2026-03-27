import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';

export default function ProjectForm({ open, onClose, project, clientId, onSaved }) {
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const isEditing = Boolean(project?.id);

  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name || '');
        setDueDate(project.due_date || '');
        setNotes(project.notes || '');
      } else {
        setName('');
        setDueDate('');
        setNotes('');
      }
    }
  }, [open, project]);

  async function handleSubmit() {
    if (!name.trim()) return;

    try {
      if (isEditing) {
        await window.api.updateProject(project.id, {
          name: name.trim(),
          due_date: dueDate || null,
          notes: notes || null,
        });
      } else {
        await window.api.createProject({
          client_id: clientId,
          name: name.trim(),
          due_date: dueDate || null,
          notes: notes || null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Project' : 'New Project'}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Project Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            placeholder="e.g. Website Redesign"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 resize-none"
          />
        </div>

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
