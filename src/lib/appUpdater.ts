// Official GitHub Releases Auto-Updater Service for Daily Sumire
// Checks for new APK releases directly from GitHub Releases API

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
 * Checks public GitHub Releases API for the newest release metadata and APK asset
 */
export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
      cache: 'no-cache',
    });

    if (!res.ok) {
      console.warn('GitHub Releases API returned HTTP', res.status);
      return null;
    }

    const data = await res.json();
    if (!data || (!data.tag_name && !data.name)) return null;

    const rawTag = data.tag_name || data.name;
    const remoteVersion = rawTag.startsWith('v') ? rawTag : `v${rawTag}`;
    const isNewer = isVersionNewer(remoteVersion, CURRENT_APP_VERSION);

    // Find APK in release assets (prefers app-release.apk or Daily-Sumire-app-debug.apk)
    const assets: any[] = data.assets || [];
    const apkAsset = assets.find((a) => a.name?.toLowerCase().endsWith('.apk')) || assets[0];

    if (!apkAsset || !apkAsset.browser_download_url) {
      return null;
    }

    const sizeMb = apkAsset.size
      ? (apkAsset.size / (1024 * 1024)).toFixed(1) + ' MB'
      : '7.3 MB';

    return {
      hasUpdate: isNewer,
      version: remoteVersion,
      fileName: apkAsset.name || 'Daily-Sumire-app-debug.apk',
      fileSizeMb: sizeMb,
      downloadUrl: apkAsset.browser_download_url,
      releaseNotes: data.body || 'New updates and performance improvements.',
      publishedAt: data.published_at ? new Date(data.published_at).getTime() : Date.now(),
    };
  } catch (err) {
    console.warn('GitHub Releases update check failed:', err);
    return null;
  }
}
