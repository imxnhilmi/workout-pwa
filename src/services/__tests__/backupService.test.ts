import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { driveApiVitePlugin } from '../../../server/driveApiPlugin';
import { db, ensureSeeded } from '../../db/database';
import {
  exportDatabasePayload,
  getGoogleDriveServerStatus,
  importDatabasePayload,
  shareOrDownloadBackupFile,
  syncWithGoogleDriveServer,
} from '../backupService';

describe('Backup & Restore Service', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.delete();
    await db.open();
    await ensureSeeded();
  });

  it('exports full IndexedDB state to JSON and restores it cleanly into an empty database', async () => {
    const payload = await exportDatabasePayload();
    expect(payload.version).toBe(1);
    expect(payload.exercises.length).toBeGreaterThanOrEqual(24);
    expect(payload.templates.length).toBe(3);
    expect(payload.sessions.length).toBeGreaterThanOrEqual(3);

    await db.exercises.clear();
    await db.templates.clear();
    await db.sessions.clear();
    expect(await db.exercises.count()).toBe(0);

    const result = await importDatabasePayload(JSON.stringify(payload));
    expect(result.exercisesCount).toBe(payload.exercises.length);
    expect(result.sessionsCount).toBe(payload.sessions.length);
    expect(await db.exercises.count()).toBe(payload.exercises.length);
    expect(await db.templates.count()).toBe(payload.templates.length);
    expect(await db.sessions.count()).toBe(payload.sessions.length);
  });

  it('rejects malformed backup JSON without corrupting existing database records', async () => {
    const countBefore = await db.exercises.count();
    await expect(importDatabasePayload('{"invalid":true}')).rejects.toThrow(/Invalid backup format/);
    await expect(importDatabasePayload('not-json')).rejects.toThrow(/Invalid backup format/);
    expect(await db.exercises.count()).toBe(countBefore);
  });

  it('uses Web Share API when navigator.canShare and navigator.share support files', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);

    Object.defineProperty(navigator, 'canShare', {
      value: canShareMock,
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
    });

    const outcome = await shareOrDownloadBackupFile();
    expect(outcome).toBe('shared');
    expect(canShareMock).toHaveBeenCalledTimes(1);
    expect(shareMock).toHaveBeenCalledTimes(1);
    const sharedArg = shareMock.mock.calls[0][0];
    expect(sharedArg.title).toBe('Workout Tracker Backup');
    expect(sharedArg.files).toHaveLength(1);
    expect(sharedArg.files[0].name).toMatch(/^workout-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('falls back to anchor file download when Web Share API is unavailable', async () => {
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });

    const createObjectURLMock = vi.fn().mockReturnValue('blob:workout-backup');
    const revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const outcome = await shareOrDownloadBackupFile();
    expect(outcome).toBe('downloaded');
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:workout-backup');
  });

  it('checks Google Drive server status and syncs push/pull via /api/drive endpoints', async () => {
    const payload = await exportDatabasePayload();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // Status check
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        configured: false,
        message: 'Server .env Google Drive credentials are not configured yet.',
      }),
    });

    const status = await getGoogleDriveServerStatus();
    expect(status.configured).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('/api/drive/status');

    // Push sync
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        message: 'Uploaded workout-tracker-db.json to Google Drive.',
        syncedAt: '2026-11-13T10:00:00.000Z',
      }),
    });

    const pushRes = await syncWithGoogleDriveServer('push');
    expect(pushRes.ok).toBe(true);
    expect(pushRes.syncedAt).toBe('2026-11-13T10:00:00.000Z');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/drive/push',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // Clear DB and test Pull sync restoring DB
    await db.exercises.clear();
    expect(await db.exercises.count()).toBe(0);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        message: 'Downloaded backup from Google Drive.',
        syncedAt: '2026-11-13T10:05:00.000Z',
        payload,
      }),
    });

    const pullRes = await syncWithGoogleDriveServer('pull');
    expect(pullRes.ok).toBe(true);
    expect(await db.exercises.count()).toBe(payload.exercises.length);
  });

  it('driveApiVitePlugin middleware reports status without exposing secret values', async () => {
    const plugin = driveApiVitePlugin();
    let registeredMiddleware: ((req: unknown, res: unknown, next: () => void) => Promise<void>) | undefined;

    const fakeServer = {
      middlewares: {
        use(fn: (req: unknown, res: unknown, next: () => void) => Promise<void>) {
          registeredMiddleware = fn;
        },
      },
    };

    if (typeof plugin.configureServer === 'function') {
      (plugin.configureServer as (server: unknown) => void)(fakeServer);
    }
    expect(registeredMiddleware).toBeDefined();

    let statusCode = 0;
    let bodyText = '';
    const fakeRes = {
      set statusCode(code: number) {
        statusCode = code;
      },
      get statusCode() {
        return statusCode;
      },
      setHeader: vi.fn(),
      end(str: string) {
        bodyText = str;
      },
    };

    await registeredMiddleware!(
      { url: '/api/drive/status', method: 'GET' },
      fakeRes,
      () => {}
    );

    expect(statusCode).toBe(200);
    const parsed = JSON.parse(bodyText);
    expect(parsed).toHaveProperty('configured', false);
    expect(parsed.message).toMatch(/GOOGLE_CLIENT_ID/);
  });
});
