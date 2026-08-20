// GitHub Releases & Vercel CDN Auto-Updater Service for Daily Sumire
// Automatically checks for new APK releases directly from GitHub Releases and Vercel CDN

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
export const GITHUB_REPO = 'soka8imokenp/pwa_app';
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
 * Checks GitHub Releases API first, with fallback to Vercel CDN
 */
export async function checkForAppUpdate(customUrl?: string): Promise<AppUpdateInfo | null> {
  // 1. Primary: Check public GitHub Releases API
  try {
    const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
      cache: 'no-cache',
    });

    if (ghRes.ok) {
      const ghData = await ghRes.json();
      if (ghData && (ghData.tag_name || ghData.name)) {
        const rawTag = ghData.tag_name || ghData.name;
        const remoteVersion = rawTag.startsWith('v') ? rawTag : `v${rawTag}`;
        const isNewer = isVersionNewer(remoteVersion, CURRENT_APP_VERSION);

        // Find APK in release assets
        const assets: any[] = ghData.assets || [];
        const apkAsset = assets.find((a) => a.name?.toLowerCase().endsWith('.apk')) || assets[0];

        if (apkAsset && apkAsset.browser_download_url) {
          const sizeMb = apkAsset.size
            ? (apkAsset.size / (1024 * 1024)).toFixed(1) + ' MB'
            : '7.3 MB';

          return {
            hasUpdate: isNewer,
            version: remoteVersion,
            fileName: apkAsset.name || 'Daily-Sumire-app-debug.apk',
            fileSizeMb: sizeMb,
            downloadUrl: apkAsset.browser_download_url,
            releaseNotes: ghData.body || 'New updates and performance improvements.',
            publishedAt: ghData.published_at ? new Date(ghData.published_at).getTime() : Date.now(),
          };
        }
      }
    }
  } catch (ghErr) {
    console.warn('GitHub releases check failed, trying Vercel fallback:', ghErr);
  }

  // 2. Fallback: Check Vercel CDN distribution server
  const baseUrl = customUrl || (typeof window !== 'undefined' ? localStorage.getItem('kairo_updater_url') : '') || VERCEL_UPDATER_URL;
  if (!baseUrl) return null;

  try {
    const rootUrl = baseUrl.replace(/\/version\.json$/, '').replace(/\/api\/update$/, '').replace(/\/$/, '');
    
    let res = await fetch(`${rootUrl}/api/update`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-cache',
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(`${rootUrl}/version.json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache',
      }).catch(() => null);
    }

    if (!res || !res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || !data.version) return null;

    const remoteVersion = data.version.startsWith('v') ? data.version : `v${data.version}`;
    const isNewer = isVersionNewer(remoteVersion, CURRENT_APP_VERSION);

    let downloadUrl = data.downloadUrl || data.fileName || '/Daily-Sumire-app-debug.apk';
    if (!downloadUrl.startsWith('http')) {
      downloadUrl = `${rootUrl}/${downloadUrl.replace(/^\//, '')}`;
    }

    return {
      hasUpdate: isNewer,
      version: remoteVersion,
      fileName: data.fileName || 'Daily-Sumire-app-debug.apk',
      fileSizeMb: data.fileSizeMb || data.fileSize || '7.3 MB',
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
