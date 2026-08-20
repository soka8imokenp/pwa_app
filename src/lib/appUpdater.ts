// Direct Vercel CDN Auto-Updater Service for Daily Sumire
// Connects to the Vercel distribution server for instant update checks & downloads

export interface AppUpdateInfo {
  hasUpdate: boolean;
  version: string;
  fileName: string;
  fileSizeMb: string;
  downloadUrl: string;
  releaseNotes: string;
  publishedAt: number;
}

export const CURRENT_APP_VERSION = 'v1.4.0';
export const VERCEL_UPDATER_URL = 'https://sumiredaily-updater.vercel.app';

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
export async function checkForAppUpdate(customUrl?: string): Promise<AppUpdateInfo | null> {
  const baseUrl = customUrl || (typeof window !== 'undefined' ? localStorage.getItem('kairo_updater_url') : '') || VERCEL_UPDATER_URL;
  if (!baseUrl) return null;

  try {
    const rootUrl = baseUrl.replace(/\/version\.json$/, '').replace(/\/api\/update$/, '').replace(/\/$/, '');
    
    // 1. Try dynamic /api/update endpoint first (which automatically scans for any .apk)
    let res = await fetch(`${rootUrl}/api/update`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-cache',
    }).catch(() => null);

    // 2. Fallback to /version.json static file
    if (!res || !res.ok) {
      res = await fetch(`${rootUrl}/version.json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache',
      }).catch(() => null);
    }

    if (!res || !res.ok) {
      console.warn('Updater fetch returned error or unreachable');
      return null;
    }

    const data = await res.json();
    if (!data || !data.version) return null;

    const remoteVersion = data.version.startsWith('v') ? data.version : `v${data.version}`;
    const isNewer = isVersionNewer(remoteVersion, CURRENT_APP_VERSION);

    let downloadUrl = data.downloadUrl || data.fileName || '/Daily-Sumire-app-debug.apk';
    if (!downloadUrl.startsWith('http')) {
      const rootUrl = baseUrl.replace(/\/version\.json$/, '').replace(/\/api\/update$/, '').replace(/\/$/, '');
      downloadUrl = `${rootUrl}/${downloadUrl.replace(/^\//, '')}`;
    }

    return {
      hasUpdate: isNewer,
      version: remoteVersion,
      fileName: data.fileName || 'Daily-Sumire-app-debug.apk',
      fileSizeMb: data.fileSize || data.fileSizeMb || '7.3 MB',
      downloadUrl,
      releaseNotes: data.releaseNotes || 'New updates and performance improvements.',
      publishedAt: data.publishedAt ? new Date(data.publishedAt).getTime() : Date.now(),
    };
  } catch (err) {
    console.warn('App update check failed:', err);
    return null;
  }
}

// Backward compatibility alias
export const checkForTelegramUpdate = checkForAppUpdate;
