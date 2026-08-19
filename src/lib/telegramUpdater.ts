// Telegram Bot Auto-Updater Service for Daily Sumire
// Checks for new APK releases posted in the private Telegram updates group

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

/**
 * Parses version numbers like "v1.4.0" or "1.4" into numeric array for comparison
 */
function parseVersion(v: string): number[] {
  const clean = v.replace(/[^0-9.]/g, '');
  return clean.split('.').map((n) => parseInt(n, 10) || 0);
}

/**
 * Returns true if remote version is strictly greater than local version
 */
function isVersionNewer(remote: string, local: string): boolean {
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
 * Checks Telegram group for the latest APK document upload
 */
export async function checkForTelegramUpdate(): Promise<AppUpdateInfo | null> {
  try {
    // 1. Fetch recent updates from Telegram Bot API (last 25 updates)
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

    // 2. Iterate backwards to find the newest message with an APK or document
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
        // Extract version from file name or caption (e.g., "Daily-Sumire-v1.4.0.apk" or "v1.4")
        const caption: string = msg.caption || '';
        const versionMatch = fileName.match(/v?(\d+\.\d+(\.\d+)?)/i) || caption.match(/v?(\d+\.\d+(\.\d+)?)/i);
        const remoteVersion = versionMatch ? `v${versionMatch[1]}` : 'v1.4.0';

        const fileSizeMb = (doc.file_size / (1024 * 1024)).toFixed(1) + ' MB';

        // 3. Resolve direct Telegram download URL for the file
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
    console.error('Error checking for Telegram update:', err);
    return null;
  }
}
