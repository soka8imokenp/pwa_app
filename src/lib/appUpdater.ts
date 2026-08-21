// Official GitHub Releases Auto-Updater Service for Daily Sumire
// Checks for new APK releases directly from GitHub Releases API with Raw Fallback

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
 * Extracts a valid version string like "v1.4.6" from GitHub release metadata
 */
export function extractVersionString(data: any): string {
  if (!data) return '';
  if (data.tag_name && data.tag_name.toLowerCase() !== 'latest') {
    return data.tag_name.startsWith('v') ? data.tag_name : `v${data.tag_name}`;
  }
  if (data.name) {
    const match = data.name.match(/v?(\d+\.\d+(\.\d+)?)/i);
    if (match) {
      return match[0].startsWith('v') ? match[0] : `v${match[0]}`;
    }
  }
  return data.tag_name || '';
}

/**
 * Checks public GitHub Releases API for the latest release.
 * Falls back to raw.githubusercontent.com if api.github.com is rate-limited.
 */
export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  const timestamp = Date.now();

  // Method 1: Try GitHub Releases API
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest?_t=${timestamp}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data) {
        const remoteVersion = extractVersionString(data);
        if (remoteVersion) {
          const isNewer = isVersionNewer(remoteVersion, CURRENT_APP_VERSION);
          const assets: any[] = data.assets || [];
          const apkAsset =
            assets.find((a) => a.name?.toLowerCase().includes('sumire') && a.name?.toLowerCase().endsWith('.apk')) ||
            assets.find((a) => a.name?.toLowerCase().endsWith('.apk')) ||
            assets[0];

          const downloadUrl = apkAsset?.browser_download_url ||
            `https://github.com/${GITHUB_REPO}/releases/latest/download/Daily-Sumire-app-debug.apk`;

          const sizeMb = apkAsset?.size
            ? (apkAsset.size / (1024 * 1024)).toFixed(1) + ' MB'
            : '7.3 MB';

          return {
            hasUpdate: isNewer,
            version: remoteVersion,
            fileName: apkAsset?.name || 'Daily-Sumire-app-debug.apk',
            fileSizeMb: sizeMb,
            downloadUrl,
            releaseNotes: data.body || 'New updates and performance improvements.',
            publishedAt: data.published_at ? new Date(data.published_at).getTime() : Date.now(),
          };
        }
      }
    }
  } catch (err) {
    console.warn('GitHub API check failed, trying raw fallback:', err);
  }

  // Method 2: Fallback to raw repository package.json (immune to GitHub API rate limits)
  try {
    const rawRes = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json?_t=${timestamp}`,
      { cache: 'no-store' }
    );

    if (rawRes.ok) {
      const rawPkg = await rawRes.json();
      if (rawPkg && rawPkg.version) {
        const rawVer = rawPkg.version.startsWith('v') ? rawPkg.version : `v${rawPkg.version}`;
        const isNewer = isVersionNewer(rawVer, CURRENT_APP_VERSION);

        return {
          hasUpdate: isNewer,
          version: rawVer,
          fileName: 'Daily-Sumire-app-debug.apk',
          fileSizeMb: '7.3 MB',
          downloadUrl: `https://github.com/${GITHUB_REPO}/releases/latest/download/Daily-Sumire-app-debug.apk`,
          releaseNotes: 'New updates and improvements.',
          publishedAt: Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn('Raw fallback check failed:', err);
  }

  return null;
}
