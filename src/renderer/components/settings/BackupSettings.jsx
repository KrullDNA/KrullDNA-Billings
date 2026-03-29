import React, { useState, useEffect } from 'react';

export default function BackupSettings() {
  const [backupFolder, setBackupFolder] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const settings = await window.api.getSettings();
      setBackupFolder(settings.backup_folder || '');
    }
    load();
  }, []);

  async function handleChooseFolder() {
    const folder = await window.api.chooseBackupFolder();
    if (folder) {
      setBackupFolder(folder);
      await window.api.saveSetting('backup_folder', folder);
      setStatus({ type: 'success', message: 'Backup folder set.' });
    }
  }

  async function handleBackup() {
    if (!backupFolder) {
      setStatus({ type: 'error', message: 'Please choose a backup folder first.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const result = await window.api.backupDatabase(backupFolder);
      setStatus({ type: 'success', message: `Backup saved: ${result.filename}` });
    } catch (err) {
      setStatus({ type: 'error', message: `Backup failed: ${err.message}` });
    }
    setLoading(false);
  }

  async function handleRestore() {
    const filePath = await window.api.chooseRestoreFile();
    if (!filePath) return;
    if (!confirm('Restore from backup? Your current data will be replaced. A safety copy will be saved automatically.')) return;
    setLoading(true);
    setStatus(null);
    try {
      await window.api.restoreDatabase(filePath);
      setStatus({ type: 'success', message: 'Database restored successfully. Please restart the app.' });
    } catch (err) {
      setStatus({ type: 'error', message: `Restore failed: ${err.message}` });
    }
    setLoading(false);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Backup & Restore</h2>
      <p className="text-sm text-gray-500 mb-6">Back up your database to a folder (e.g. Dropbox) and restore from a backup file.</p>

      {/* Backup Folder */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Backup Folder</label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            readOnly
            value={backupFolder}
            placeholder="No folder selected"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600"
          />
          <button onClick={handleChooseFolder} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Browse...
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Choose your Dropbox folder or any local folder to save backups to.</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBackup}
          disabled={loading || !backupFolder}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            loading || !backupFolder
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {loading ? 'Working...' : 'Backup Now'}
        </button>
        <button
          onClick={handleRestore}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Restore from Backup...
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className={`px-4 py-3 rounded-md text-sm ${
          status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
