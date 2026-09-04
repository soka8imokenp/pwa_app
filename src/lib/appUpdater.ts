// Official GitHub Releases Auto-Updater Service for Daily Sumire
// Checks for new APK releases directly from GitHub Releases API with robust multi-release parsing & Raw Fallback

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
 * Parses version numbers like "v1.4.0", "1.4.6", "v1.5.8" into numeric array for exact comparison
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
 * Extracts a valid version string like "v1.5.8" from GitHub release metadata
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
 * Dynamically resolves real patch notes from GitHub release body or public/version.json,
 * preventing stale or generic build templates.
 */
export async function getDynamicPatchNotes(rawBody?: string | null): Promise<string> {
  const isGeneric =
    !rawBody ||
    rawBody.includes('Automated GitHub Actions Build & Release') ||
    rawBody.includes('Direct APK downloads attached below') ||
    rawBody.includes('New updates and performance improvements.') ||
    rawBody.trim().length < 15;

  if (!isGeneric && rawBody) {
    return rawBody.trim();
  }

  // 1. Try fetching real changelog from raw GitHub repository public/version.json
  try {
    const rawRes = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/version.json?_t=${Date.now()}`,
      { cache: 'no-store' }
    );
    if (rawRes.ok) {
      const data = await rawRes.json();
      if (Array.isArray(data.changelog) && data.changelog.length > 0) {
        return data.changelog.map((item: string) => `• ${item}`).join('\n');
      }
    }
  } catch {}

  // 2. Fallback to local /version.json
  try {
    const localRes = await fetch(`/version.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (localRes.ok) {
      const data = await localRes.json();
      if (Array.isArray(data.changelog) && data.changelog.length > 0) {
        return data.changelog.map((item: string) => `• ${item}`).join('\n');
      }
    }
  } catch {}

  return '• Refined AI coach contextual analysis for nutrition & hydration\n• Prevent automatic logging without explicit confirmation\n• Clean animated updater panel with smooth install action';
}

/**
 * Checks public GitHub Releases API for the latest release.
 * Queries all releases to always pick the highest version, immune to GitHub's 'latest' pointer caching.
 */
export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  const timestamp = Date.now();

  // Method 1: Check GitHub Releases list to find the truly newest release version
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=15&_t=${timestamp}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (res.ok) {
      const releases = await res.json();
      if (Array.isArray(releases) && releases.length > 0) {
        let newestRelease: any = null;
        let newestVersion = '';

        for (const rel of releases) {
          const ver = extractVersionString(rel);
          if (ver) {
            if (!newestVersion || isVersionNewer(ver, newestVersion)) {
              newestVersion = ver;
              newestRelease = rel;
            }
          }
        }

        if (newestRelease && newestVersion) {
          const isNewer = isVersionNewer(newestVersion, CURRENT_APP_VERSION);
          const assets: any[] = newestRelease.assets || [];
          const apkAsset =
            assets.find((a: any) => a.name?.toLowerCase().includes('sumire') && a.name?.toLowerCase().endsWith('.apk')) ||
            assets.find((a: any) => a.name?.toLowerCase().endsWith('.apk')) ||
            assets[0];

          const downloadUrl =
            apkAsset?.browser_download_url ||
            `https://github.com/${GITHUB_REPO}/releases/download/${newestRelease.tag_name || newestVersion}/Daily-Sumire-app-debug.apk`;

          const sizeMb = apkAsset?.size
            ? (apkAsset.size / (1024 * 1024)).toFixed(1) + ' MB'
            : '7.4 MB';

          const releaseNotes = await getDynamicPatchNotes(newestRelease.body);

          return {
            hasUpdate: isNewer,
            version: newestVersion,
            fileName: apkAsset?.name || 'Daily-Sumire-app-debug.apk',
            fileSizeMb: sizeMb,
            downloadUrl,
            releaseNotes,
            publishedAt: newestRelease.published_at ? new Date(newestRelease.published_at).getTime() : Date.now(),
          };
        }
      }
    }
  } catch (err) {
    console.warn('GitHub API releases list check failed, trying single release fallback:', err);
  }

  // Method 2: Fallback to GitHub Releases /latest endpoint
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest?_t=${timestamp}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github.v3+json',
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

          const downloadUrl =
            apkAsset?.browser_download_url ||
            `https://github.com/${GITHUB_REPO}/releases/latest/download/Daily-Sumire-app-debug.apk`;

          const sizeMb = apkAsset?.size
            ? (apkAsset.size / (1024 * 1024)).toFixed(1) + ' MB'
            : '7.4 MB';

          const releaseNotes = await getDynamicPatchNotes(data.body);

          return {
            hasUpdate: isNewer,
            version: remoteVersion,
            fileName: apkAsset?.name || 'Daily-Sumire-app-debug.apk',
            fileSizeMb: sizeMb,
            downloadUrl,
            releaseNotes,
            publishedAt: data.published_at ? new Date(data.published_at).getTime() : Date.now(),
          };
        }
      }
    }
  } catch (err) {
    console.warn('GitHub releases/latest check failed:', err);
  }

  // Method 3: Fallback to raw repository package.json (immune to GitHub API rate limits)
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
        const releaseNotes = await getDynamicPatchNotes(null);

        return {
          hasUpdate: isNewer,
          version: rawVer,
          fileName: 'Daily-Sumire-app-debug.apk',
          fileSizeMb: '7.4 MB',
          downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/${rawVer}/Daily-Sumire-app-debug.apk`,
          releaseNotes,
          publishedAt: Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn('Raw fallback check failed:', err);
  }

  return null;
}
