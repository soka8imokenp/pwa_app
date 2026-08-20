// Multi-Source Auto-Updater Service for Daily Sumire
// Supports Direct Vercel CDN Updates (Primary) and Telegram Bot Updates (Fallback)

export interface AppUpdateInfo {
  hasUpdate: boolean;
  version: string;
  fileName: string;
  fileSizeMb: string;
  downloadUrl: string;
  releaseNotes: string;
  publishedAt: number;
}

export const CURRENT_APP_VERSION = 'v1.3.1';
const TG_BOT_TOKEN = '8803102733:AAGtODOAWtN4yQlG0xXSiDuChK1PcqIDq8I';

// Default Vercel Updater URL (can be customized or saved in localStorage)
export const DEFAULT_VERCEL_UPDATER_URL = '';

/**
 * Parses version numbers like "v1.4.0" or "1.4" into numeric array for comparison
 */
export function parseVersion(v: string): number[] {
  const clean = v.replace(/[^0-9.]/g, '');
  return clean.split('.').map((n) => parseInt(n, 10) || 0);
}

/**
 * Returns true if remote version is strictly greater than local version
 */
export function isVersionNewer(remote: string, local: string): boolean {
  const rParts = parseVersion(remote);
  const lParts = parseVersion(local);

  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/**
 * Checks Vercel CDN endpoint for the newest release metadata
 */
export async function checkForVercelUpdate(customUrl?: string): Promise<AppUpdateInfo | null> {
  const baseUrl = customUrl || (typeof window !== 'undefined' ? localStorage.getItem('kairo_updater_url') : '') || DEFAULT_VERCEL_UPDATER_URL;
  if (!baseUrl) return null;

  try {
    const endpoint = baseUrl.endsWith('/version.json') || baseUrl.endsWith('/api/update')
      ? baseUrl
      : `${baseUrl.replace(/\/$/, '')}/version.json`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-cache',
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.version) return null;

    const remoteVersion = data.version.startsWith('v') ? data.version : `v${data.version}`;
    const isNewer = isVersionNewer(remoteVersion, CURRENT_APP_VERSION);

    let downloadUrl = data.downloadUrl || data.fileName || '/Daily-Sumire-latest.apk';
    if (!downloadUrl.startsWith('http')) {
      const rootUrl = baseUrl.replace(/\/version\.json$/, '').replace(/\/api\/update$/, '').replace(/\/$/, '');
      downloadUrl = `${rootUrl}/${downloadUrl.replace(/^\//, '')}`;
    }

    return {
      hasUpdate: isNewer,
      version: remoteVersion,
      fileName: data.fileName || 'Daily-Sumire-latest.apk',
      fileSizeMb: data.fileSize || data.fileSizeMb || '7.5 MB',
      downloadUrl,
      releaseNotes: data.releaseNotes || 'New updates and improvements.',
      publishedAt: data.publishedAt ? new Date(data.publishedAt).getTime() : Date.now(),
    };
  } catch (err) {
    console.warn('Vercel updater check failed:', err);
    return null;
  }
}

/**
 * Checks Telegram group for the latest APK document upload
 */
export async function checkForTelegramUpdate(): Promise<AppUpdateInfo | null> {
  // 1. Try Vercel CDN first if configured
  const vercelUpdate = await checkForVercelUpdate();
  if (vercelUpdate) return vercelUpdate;

  try {
    // 2. Fallback to Telegram Bot API
    const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getUpdates?offset=-25`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      console.warn('Telegram Bot API response error:', res.status);
      return null;
    }

    const data = await res.json();
    if (!data.ok || !Array.isArray(data.result) || data.result.length === 0) {
      return null;
    }

    const updates = data.result;
    for (let i = updates.length - 1; i >= 0; i--) {
      const u = updates[i];
      const msg = u.message || u.channel_post || u.edited_message;
      if (!msg) continue;

      const doc = msg.document;
      if (!doc) continue;

      const fileName: string = doc.file_name || 'update.apk';
      const isApk = fileName.toLowerCase().endsWith('.apk') || doc.mime_type === 'application/vnd.android.package-archive';

      if (isApk || fileName.includes('.apk')) {
        const caption: string = msg.caption || '';
        const versionMatch = fileName.match(/v?(\d+\.\d+(\.\d+)?)/i) || caption.match(/v?(\d+\.\d+(\.\d+)?)/i);
        const remoteVersion = versionMatch ? `v${versionMatch[1]}` : 'v1.4.0';

        const fileSizeMb = (doc.file_size / (1024 * 1024)).toFixed(1) + ' MB';

        const fileRes = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getFile?file_id=${doc.file_id}`);
        const fileData = await fileRes.json();

        if (fileData.ok && fileData.result?.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${TG_BOT_TOKEN}/${fileData.result.file_path}`;
          const isNewer = isVersionNewer(remoteVersion, CURRENT_APP_VERSION);

          return {
            hasUpdate: isNewer,
            version: remoteVersion,
            fileName,
            fileSizeMb,
            downloadUrl,
            releaseNotes: caption || 'New performance improvements and updates from the archive.',
            publishedAt: (msg.date || Date.now() / 1000) * 1000,
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Error checking for update:', err);
    return null;
  }
}
