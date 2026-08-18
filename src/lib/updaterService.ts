export interface AppVersionInfo {
  version: string;
  buildNumber: number;
  releaseDate: string;
  changelog: string[];
  downloadUrl: string;
}

export const CURRENT_APP_VERSION = '1.3.0';
export const CURRENT_BUILD_NUMBER = 10;

// URL to check for updates (GitHub raw or Vercel)
const VERSION_URLS = [
  'https://raw.githubusercontent.com/soka8imokenp/pwa_app/main/public/version.json',
  'https://sumiredaily-music.vercel.app/version.json',
  '/version.json',
];

export async function checkForAppUpdate(): Promise<{ hasUpdate: boolean; updateInfo: AppVersionInfo | null }> {
  for (const url of VERSION_URLS) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`);
      if (res.ok) {
        const data: AppVersionInfo = await res.json();
        if (data && data.version) {
          const hasUpdate = isNewerVersion(data.version, CURRENT_APP_VERSION);
          return { hasUpdate, updateInfo: data };
        }
      }
    } catch {
      // try next
    }
  }

  return { hasUpdate: false, updateInfo: null };
}

function isNewerVersion(remote: string, current: string): boolean {
  const rParts = remote.replace(/^v/, '').split('.').map(Number);
  const cParts = current.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}
