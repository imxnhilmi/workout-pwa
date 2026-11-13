import { db } from '../db/database';
import type { Exercise, WorkoutSession, WorkoutTemplate } from '../types/workout';

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
}

function isValidBackupPayload(data: unknown): data is BackupPayload {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const candidate = data as Record<string, unknown>;
  if (candidate.version !== 1) {
    return false;
  }
  if (!Array.isArray(candidate.exercises) || !Array.isArray(candidate.sessions)) {
    return false;
  }
  if (candidate.templates !== undefined && !Array.isArray(candidate.templates)) {
    return false;
  }

  const exercisesValid = candidate.exercises.every(
    (ex) =>
      Boolean(ex) &&
      typeof ex === 'object' &&
      typeof (ex as Exercise).id === 'string' &&
      typeof (ex as Exercise).name === 'string' &&
      typeof (ex as Exercise).category === 'string'
  );
  if (!exercisesValid) {
    return false;
  }

  const sessionsValid = candidate.sessions.every(
    (sess) =>
      Boolean(sess) &&
      typeof sess === 'object' &&
      typeof (sess as WorkoutSession).id === 'string' &&
      Array.isArray((sess as WorkoutSession).blocks)
  );
  if (!sessionsValid) {
    return false;
  }

  return true;
}

export async function exportDatabasePayload(): Promise<BackupPayload> {
  return db.transaction('r', db.exercises, db.templates, db.sessions, async () => {
    const [exercises, templates, sessions] = await Promise.all([
      db.exercises.toArray(),
      db.templates.toArray(),
      db.sessions.toArray(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      exercises,
      templates,
      sessions,
    };
  });
}

export async function importDatabasePayload(
  jsonString: string
): Promise<{ exercisesCount: number; sessionsCount: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid backup format: file is not valid JSON');
  }

  if (!isValidBackupPayload(parsed)) {
    throw new Error('Invalid backup format: missing required workout collections or version');
  }

  await db.transaction('rw', db.exercises, db.templates, db.sessions, async () => {
    await db.exercises.clear();
    await db.sessions.clear();

    await db.exercises.bulkPut(parsed.exercises);
    if (Array.isArray(parsed.templates) && parsed.templates.length > 0) {
      await db.templates.clear();
      await db.templates.bulkPut(parsed.templates);
    }
    await db.sessions.bulkPut(parsed.sessions);
  });

  return {
    exercisesCount: parsed.exercises.length,
    sessionsCount: parsed.sessions.length,
  };
}

export async function shareOrDownloadBackupFile(): Promise<'shared' | 'downloaded'> {
  const payload = await exportDatabasePayload();
  const jsonContent = JSON.stringify(payload, null, 2);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `workout-backup-${dateStamp}.json`;

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    typeof File !== 'undefined'
  ) {
    const file = new File([jsonContent], fileName, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Workout Tracker Backup',
        text: `Gym Workout Tracker backup (${dateStamp})`,
      });
      return 'shared';
    }
  }

  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return 'downloaded';
}

export async function getGoogleDriveServerStatus(): Promise<{
  configured: boolean;
  message: string;
}> {
  try {
    const response = await fetch('/api/drive/status');
    if (!response.ok) {
      return {
        configured: false,
        message: 'Server Google Drive endpoint is not active.',
      };
    }
    const data = (await response.json()) as { configured?: boolean; message?: string };
    return {
      configured: Boolean(data.configured),
      message:
        data.message ??
        (data.configured
          ? 'Server-side Google Drive credentials configured.'
          : 'Server .env Google Drive credentials are not configured yet.'),
    };
  } catch {
    return {
      configured: false,
      message: 'Server Google Drive sync route is unreachable in offline mode.',
    };
  }
}

export async function syncWithGoogleDriveServer(
  direction: 'push' | 'pull'
): Promise<{ ok: boolean; message: string; syncedAt?: string }> {
  try {
    if (direction === 'push') {
      const payload = await exportDatabasePayload();
      const response = await fetch('/api/drive/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        syncedAt?: string;
      };
      return {
        ok: Boolean(data.ok),
        message:
          data.message ??
          (data.ok
            ? 'Synced backup to Google Drive.'
            : 'Failed to push backup to Google Drive.'),
        syncedAt: data.syncedAt,
      };
    }

    const response = await fetch('/api/drive/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = (await response.json()) as {
      ok?: boolean;
      message?: string;
      syncedAt?: string;
      payload?: unknown;
    };

    if (!data.ok || !data.payload) {
      return {
        ok: false,
        message: data.message ?? 'Failed to pull backup from Google Drive.',
      };
    }

    const serialized =
      typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload);
    await importDatabasePayload(serialized);

    return {
      ok: true,
      message: data.message ?? 'Restored backup from Google Drive.',
      syncedAt: data.syncedAt,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : 'Network error while communicating with Google Drive server endpoint.',
    };
  }
}
