import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Download,
  HardDrive,
  Share2,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  exportDatabasePayload,
  getGoogleDriveServerStatus,
  importDatabasePayload,
  shareOrDownloadBackupFile,
  syncWithGoogleDriveServer,
} from '../services/backupService';

interface DriveBackupPanelProps {
  onDataRestored: () => Promise<void> | void;
}

export const DriveBackupPanel: React.FC<DriveBackupPanelProps> = ({ onDataRestored }) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [driveServerStatus, setDriveServerStatus] = useState<{
    configured: boolean;
    message: string;
  }>({
    configured: false,
    message: 'Checking server .env Google Drive status...',
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    getGoogleDriveServerStatus().then((status) => {
      if (mounted) {
        setDriveServerStatus(status);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleShareOrSaveToDrive = async () => {
    try {
      const result = await shareOrDownloadBackupFile();
      setStatusMessage(
        result === 'shared'
          ? 'Opened native Share sheet — choose Google Drive to save your backup.'
          : 'Downloaded workout backup JSON file to your device.'
      );
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Share / download cancelled or failed.'
      );
    }
  };

  const handleDirectDownload = async () => {
    const payload = await exportDatabasePayload();
    const jsonContent = JSON.stringify(payload, null, 2);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `workout-backup-${dateStamp}.json`;

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    setStatusMessage(`Downloaded ${fileName} (${payload.sessions.length} sessions).`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importDatabasePayload(text);
      await onDataRestored();
      setStatusMessage(
        `Restored ${res.exercisesCount} exercises and ${res.sessionsCount} workout sessions.`
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to import backup file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleServerSync = async (direction: 'push' | 'pull') => {
    setIsSyncing(true);
    try {
      const res = await syncWithGoogleDriveServer(direction);
      setStatusMessage(res.message);
      if (res.ok && direction === 'pull') {
        await onDataRestored();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Status Banner */}
      {statusMessage && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-xs font-medium text-emerald-200">
          {statusMessage}
        </div>
      )}

      {/* Tier 1: Mobile Share Sheet / Local JSON Backup */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <HardDrive className="h-5 w-5" />
          <h2 className="text-lg font-bold text-zinc-100">
            Instant Google Drive Share &amp; Local Backup
          </h2>
        </div>
        <p className="text-xs text-zinc-400">
          All workout sessions and custom exercises are stored offline in IndexedDB. Use the 1-tap Share button on mobile to save directly to your Google Drive app without any cloud setup.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleShareOrSaveToDrive}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold text-zinc-950 shadow-md hover:bg-emerald-400"
          >
            <Share2 className="h-4 w-4" />
            <span>Save / Share to Google Drive</span>
          </button>

          <button
            type="button"
            onClick={handleDirectDownload}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-xs font-bold text-zinc-100 hover:border-emerald-500/50"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Download JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-xs font-bold text-zinc-100 hover:border-emerald-500/50"
          >
            <Upload className="h-4 w-4 text-sky-400" />
            <span>Import JSON Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
            aria-label="Import JSON Backup File"
          />
        </div>
      </div>

      {/* Tier 2: Server-Side .env Google Drive API Cloud Sync */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sky-400">
            <Cloud className="h-5 w-5" />
            <h2 className="text-lg font-bold text-zinc-100">
              Google Drive Cloud Sync (Server .env)
            </h2>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
              driveServerStatus.configured
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {driveServerStatus.configured ? 'Credentials Active' : '.env Not Configured'}
          </span>
        </div>

        <p className="text-xs text-zinc-400">{driveServerStatus.message}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleServerSync('push')}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-100 hover:border-emerald-500/50 disabled:opacity-50"
          >
            <CloudUpload className="h-4 w-4 text-emerald-400" />
            <span>Push to Google Drive</span>
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleServerSync('pull')}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-100 hover:border-sky-500/50 disabled:opacity-50"
          >
            <CloudDownload className="h-4 w-4 text-sky-400" />
            <span>Pull from Google Drive</span>
          </button>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3 text-[11px] text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300">Zero-Leak Security Architecture:</p>
          <p>
            OAuth secrets (<code className="text-emerald-400">GOOGLE_CLIENT_ID</code>,{' '}
            <code className="text-emerald-400">GOOGLE_CLIENT_SECRET</code>,{' '}
            <code className="text-emerald-400">GOOGLE_REFRESH_TOKEN</code>) are read exclusively on the server via <code className="text-zinc-300">.env</code> and never bundled into client JavaScript.
          </p>
        </div>
      </div>
    </div>
  );
};
