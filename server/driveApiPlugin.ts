import type { Plugin } from 'vite';

interface ServerEnvRecord {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
  [key: string]: string | undefined;
}

declare const process: {
  cwd(): string;
  env: ServerEnvRecord;
};

const BACKUP_FILE_NAME = 'workout-tracker-db.json';
const UNCONFIGURED_MSG =
  'Server .env Google Drive credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) are not configured yet.';

function resolveDriveCredentials(loadedEnv: ServerEnvRecord) {
  const clientId = (process.env.GOOGLE_CLIENT_ID || loadedEnv.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (
    process.env.GOOGLE_CLIENT_SECRET ||
    loadedEnv.GOOGLE_CLIENT_SECRET ||
    ''
  ).trim();
  const refreshToken = (
    process.env.GOOGLE_REFRESH_TOKEN ||
    loadedEnv.GOOGLE_REFRESH_TOKEN ||
    ''
  ).trim();
  const folderId = (
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    loadedEnv.GOOGLE_DRIVE_FOLDER_ID ||
    ''
  ).trim();

  const configured = Boolean(clientId && clientSecret && refreshToken);
  return {
    configured,
    clientId,
    clientSecret,
    refreshToken,
    folderId: folderId || undefined,
  };
}

async function exchangeRefreshTokenForAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    throw new Error(`Google OAuth token exchange failed (${tokenRes.status})`);
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error('Google OAuth response did not include an access_token');
  }

  return tokenJson.access_token;
}

async function findExistingBackupFileId(
  accessToken: string,
  folderId?: string
): Promise<string | undefined> {
  const queryParts = [`name = '${BACKUP_FILE_NAME}'`, 'trashed = false'];
  if (folderId) {
    queryParts.push(`'${folderId}' in parents`);
  }
  const q = encodeURIComponent(queryParts.join(' and '));
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&pageSize=1`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google Drive file lookup failed (${res.status})`);
  }

  const data = (await res.json()) as { files?: Array<{ id: string }> };
  return data.files?.[0]?.id;
}

async function uploadBackupToDrive(
  accessToken: string,
  payloadJson: string,
  folderId?: string
): Promise<void> {
  const existingFileId = await findExistingBackupFileId(accessToken, folderId);

  if (existingFileId) {
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: payloadJson,
      }
    );
    if (!updateRes.ok) {
      throw new Error(`Google Drive file update failed (${updateRes.status})`);
    }
    return;
  }

  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name: BACKUP_FILE_NAME,
    mimeType: 'application/json',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = 'workout_tracker_multipart_boundary';
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    payloadJson,
    `--${boundary}--`,
  ].join('\r\n');

  const createRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!createRes.ok) {
    throw new Error(`Google Drive file creation failed (${createRes.status})`);
  }
}

async function downloadBackupFromDrive(
  accessToken: string,
  folderId?: string
): Promise<unknown> {
  const existingFileId = await findExistingBackupFileId(accessToken, folderId);
  if (!existingFileId) {
    throw new Error(`No ${BACKUP_FILE_NAME} backup file found in Google Drive.`);
  }

  const downloadRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${existingFileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!downloadRes.ok) {
    throw new Error(`Google Drive file download failed (${downloadRes.status})`);
  }

  return downloadRes.json();
}

interface DriveHttpRequest {
  url?: string;
  method?: string;
  on(event: 'data', listener: (chunk: unknown) => void): void;
  on(event: 'end', listener: () => void): void;
  on(event: 'error', listener: (err: Error) => void): void;
}

interface DriveHttpResponse {
  statusCode?: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
}

function readRequestBody(req: DriveHttpRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    req.on('data', (chunk: unknown) => {
      chunks.push(typeof chunk === 'string' ? chunk : String(chunk));
    });
    req.on('end', () => resolve(chunks.join('')));
    req.on('error', (err: Error) => reject(err));
  });
}

function sendJson(
  res: DriveHttpResponse,
  statusCode: number,
  data: Record<string, unknown>
) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function driveApiVitePlugin(initialEnv: ServerEnvRecord = {}): Plugin {
  let loadedEnv: ServerEnvRecord = { ...initialEnv };

  return {
    name: 'workout-drive-api-plugin',
    async configResolved(config) {
      try {
        const { loadEnv } = await import('vite');
        loadedEnv = {
          ...loadEnv(config.mode, process.cwd(), ''),
          ...initialEnv,
        };
      } catch {
        // Fallback if called outside Vite's Node runtime
      }
    },
    configureServer(server) {
      server.middlewares.use(async (rawReq, rawRes, next) => {
        const req = rawReq as unknown as DriveHttpRequest;
        const res = rawRes as unknown as DriveHttpResponse;
        const url = req.url?.split('?')[0];
        if (!url || !url.startsWith('/api/drive/')) {
          next();
          return;
        }

        const creds = resolveDriveCredentials(loadedEnv);

        if (url === '/api/drive/status' && req.method === 'GET') {
          sendJson(res, 200, {
            configured: creds.configured,
            message: creds.configured
              ? 'Server-side Google Drive OAuth credentials configured in .env.'
              : UNCONFIGURED_MSG,
          });
          return;
        }

        if (url === '/api/drive/push' && req.method === 'POST') {
          if (!creds.configured) {
            sendJson(res, 200, {
              ok: false,
              message: UNCONFIGURED_MSG,
            });
            return;
          }

          try {
            const rawBody = await readRequestBody(req);
            const parsed = JSON.parse(rawBody || '{}') as { payload?: unknown };
            if (!parsed.payload || typeof parsed.payload !== 'object') {
              sendJson(res, 400, {
                ok: false,
                message: 'Missing backup payload in request body.',
              });
              return;
            }

            const accessToken = await exchangeRefreshTokenForAccessToken(
              creds.clientId,
              creds.clientSecret,
              creds.refreshToken
            );
            await uploadBackupToDrive(
              accessToken,
              JSON.stringify(parsed.payload, null, 2),
              creds.folderId
            );

            sendJson(res, 200, {
              ok: true,
              message: `Uploaded ${BACKUP_FILE_NAME} to Google Drive.`,
              syncedAt: new Date().toISOString(),
            });
          } catch (err) {
            sendJson(res, 500, {
              ok: false,
              message:
                err instanceof Error ? err.message : 'Google Drive push failed on server.',
            });
          }
          return;
        }

        if (url === '/api/drive/pull' && req.method === 'POST') {
          if (!creds.configured) {
            sendJson(res, 200, {
              ok: false,
              message: UNCONFIGURED_MSG,
            });
            return;
          }

          try {
            const accessToken = await exchangeRefreshTokenForAccessToken(
              creds.clientId,
              creds.clientSecret,
              creds.refreshToken
            );
            const payload = await downloadBackupFromDrive(accessToken, creds.folderId);

            sendJson(res, 200, {
              ok: true,
              message: `Downloaded ${BACKUP_FILE_NAME} from Google Drive.`,
              payload,
              syncedAt: new Date().toISOString(),
            });
          } catch (err) {
            sendJson(res, 500, {
              ok: false,
              message:
                err instanceof Error ? err.message : 'Google Drive pull failed on server.',
            });
          }
          return;
        }

        next();
      });
    },
  };
}
