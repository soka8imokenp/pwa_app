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

import pkg from '../../package.json';

export const CURRENT_APP_VERSION = pkg.version.startsWith('v') ? pkg.version : `v${pkg.version}`;
export const GITHUB_REPO = 'soka8imokenp/pwa_app';

/**
 * Parses version numbers like "v1.4.0", "1.4.6", "v1.4" into numeric array for comparison
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
 * Checks public GitHub Releases API for the newest release metadata and APK asset.
 * Uses cache-busting (?_t=...) and searches across all recent releases to ensure
 * the absolute newest version is always discovered.
 */
export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  try {
    const timestamp = Date.now();
    
    // 1. First try fetching the recent releases list with cache-busting
    let releasesList: any[] = [];
    try {
      const listRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10&_t=${timestamp}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          cache: 'no-cache',
        }
      );

      if (listRes.ok) {
        const data = await listRes.json();
        if (Array.isArray(data) && data.length > 0) {
          releasesList = data;
        }
      }
    } catch (e) {
      console.warn('Releases list fetch failed, trying latest endpoint fallback:', e);
    }

    // 2. Fallback to /releases/latest if list failed
    if (releasesList.length === 0) {
      const latestRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest?_t=${timestamp}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          cache: 'no-cache',
        }
      );

      if (latestRes.ok) {
        const latestData = await latestRes.json();
        if (latestData) {
          releasesList = [latestData];
        }
      }
    }

    if (releasesList.length === 0) {
      console.warn('Could not retrieve any release from GitHub');
      return null;
    }

    // 3. Find release with the highest semantic version that has an APK asset
    let bestRelease: any = null;
    let highestVersionTag = '';

    for (const rel of releasesList) {
      if (rel.draft) continue; // skip drafts

      const rawTag = rel.tag_name || rel.name || '';
      if (!rawTag) continue;

      const assets: any[] = rel.assets || [];
      const hasApk = assets.some((a) => a.name?.toLowerCase().endsWith('.apk'));
      if (!hasApk) continue;

      const normTag = rawTag.startsWith('v') ? rawTag : `v${rawTag}`;

      if (!bestRelease || isVersionNewer(normTag, highestVersionTag)) {
        bestRelease = rel;
        highestVersionTag = normTag;
      }
    }

    if (!bestRelease) {
      return null;
    }

    const isNewer = isVersionNewer(highestVersionTag, CURRENT_APP_VERSION);
    const assets: any[] = bestRelease.assets || [];
    const apkAsset =
      assets.find((a) => a.name?.toLowerCase().includes('sumire') && a.name?.toLowerCase().endsWith('.apk')) ||
      assets.find((a) => a.name?.toLowerCase().endsWith('.apk')) ||
      assets[0];

    if (!apkAsset || !apkAsset.browser_download_url) {
      return null;
    }

    const sizeMb = apkAsset.size
      ? (apkAsset.size / (1024 * 1024)).toFixed(1) + ' MB'
      : '7.3 MB';

    return {
      hasUpdate: isNewer,
      version: highestVersionTag,
      fileName: apkAsset.name || 'Daily-Sumire-app-debug.apk',
      fileSizeMb: sizeMb,
      downloadUrl: apkAsset.browser_download_url,
      releaseNotes: bestRelease.body || 'New updates and performance improvements.',
      publishedAt: bestRelease.published_at ? new Date(bestRelease.published_at).getTime() : Date.now(),
    };
  } catch (err) {
    console.warn('GitHub Releases update check failed:', err);
    return null;
  }
}
