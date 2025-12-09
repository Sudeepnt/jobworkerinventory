'use client';

import { useState, useRef, useEffect } from 'react';
import { Home, Download, Upload, Database, CheckCircle, XCircle, Clock, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { 
  exportAllData, 
  importAllData, 
  getBackupHistory, 
  addBackupHistoryEntry,
  clearDatabase 
} from './lib/storage';
import { formatDateTime } from './lib/date-utils';

interface BackupRestoreProps {
  onNavigate: (page: string) => void;
}

export default function BackupRestore({ onNavigate }: BackupRestoreProps) {
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [restoreMessage, setRestoreMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBackupHistory();
  }, []);

  const loadBackupHistory = async () => {
    try {
      const data = await getBackupHistory();
      const history = data.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setBackupHistory(history);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setRestoreStatus('processing');
      setRestoreMessage('Fetching data from Supabase...');
      setProgress(20);

      const data = await exportAllData();
      setProgress(60);

      setRestoreMessage('Creating backup file...');
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      // Filename uses standard ISO format (YYYY-MM-DD) for better file sorting
      const filename = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(90);

      await addBackupHistoryEntry({
        type: 'backup',
        timestamp: new Date().toISOString(),
        filename: filename,
      });

      setProgress(100);
      await loadBackupHistory();

      setRestoreStatus('success');
      setRestoreMessage('Backup created successfully!');
      setTimeout(() => {
        setRestoreStatus('idle');
        setProgress(0);
      }, 3000);
    } catch (error) {
      console.error('Backup error:', error);
      setRestoreStatus('error');
      setRestoreMessage('Failed to create backup.');
      setTimeout(() => {
        setRestoreStatus('idle');
        setProgress(0);
      }, 3000);
    }
  };

  const triggerRestore = (mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      const confirmDelete = window.confirm("CRITICAL WARNING: This will DELETE ALL EXISTING DATA from the database and replace it with the backup. Are you sure?");
      if (!confirmDelete) return;
    }
    setRestoreMode(mode);
    fileInputRef.current?.click();
  };

  const handleRestoreFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreStatus('processing');
    setProgress(0);

    try {
      if (restoreMode === 'replace') {
        setRestoreMessage('Clearing existing database...');
        setProgress(10);
        const clearSuccess = await clearDatabase();
        if (!clearSuccess) throw new Error("Failed to clear database");
      }

      setRestoreMessage('Reading backup file...');
      
      const reader = new FileReader();

      reader.onprogress = (e: ProgressEvent<FileReader>) => {
        if (e.lengthComputable) {
          const percentComplete = 20 + (e.loaded / e.total) * 30;
          setProgress(percentComplete);
        }
      };

      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const content = e.target?.result as string;
          
          setRestoreMessage('Uploading data to Supabase...');
          setProgress(60);

          const success = await importAllData(content);

          if (success) {
            setProgress(90);
            setRestoreMessage('Finalizing...');

            await addBackupHistoryEntry({
              type: 'restore',
              timestamp: new Date().toISOString(),
              filename: `${file.name} (${restoreMode === 'replace' ? 'Clean' : 'Merge'})`,
            });

            await loadBackupHistory();

            setProgress(100);
            setRestoreStatus('success');
            setRestoreMessage('Data restored successfully! reloading...');

            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            throw new Error('Import function returned false');
          }
        } catch (error) {
          console.error('Restore processing error:', error);
          setRestoreStatus('error');
          setRestoreMessage('Failed to process backup data.');
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Restore error:', error);
      setRestoreStatus('error');
      setRestoreMessage('An error occurred during initialization.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
        <div className="w-24"></div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleRestoreFileChange}
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">1. Download Backup</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 min-h-[40px]">
            Safe & Secure. Download all current data from the database to your computer as a file.
          </p>
          <button
            onClick={handleBackup}
            disabled={restoreStatus === 'processing'}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download Data
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-red-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">2. Clean Restore</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 min-h-[40px]">
            <span className="text-red-600 font-bold">DANGER:</span> Deletes ALL current data in the database and replaces it with the backup file.
          </p>
          <button
            onClick={() => triggerRestore('replace')}
            disabled={restoreStatus === 'processing'}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Delete Old & Upload
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-orange-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">3. Merge Restore</h2>
          </div>
          <div className="text-sm text-gray-600 mb-6 min-h-[40px]">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <span className="text-orange-800 font-medium">
                Warning: This adds data to existing records. Duplicates may occur!
              </span>
            </div>
          </div>
          <button
            onClick={() => triggerRestore('merge')}
            disabled={restoreStatus === 'processing'}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Add to Existing Data
          </button>
        </div>

      </div>

      {restoreStatus !== 'idle' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-4">
            {restoreStatus === 'processing' && (
              <>
                <Clock className="w-6 h-6 text-blue-600 animate-spin" />
                <span className="text-lg font-semibold text-gray-900">Processing...</span>
              </>
            )}
            {restoreStatus === 'success' && (
              <>
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="text-lg font-semibold text-green-900">Success</span>
              </>
            )}
            {restoreStatus === 'error' && (
              <>
                <XCircle className="w-6 h-6 text-red-600" />
                <span className="text-lg font-semibold text-red-900">Error</span>
              </>
            )}
          </div>
          <p className="text-gray-700 mb-4">{restoreMessage}</p>
          {restoreStatus === 'processing' && (
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">History Log</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backupHistory.length > 0 ? (
                backupHistory.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {/* Fixed: Uses formatDateTime for strict locale consistency */}
                      {formatDateTime(entry.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.type === 'backup' ? (
                        <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                          Backup
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                          Restore
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.filename}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    No history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}