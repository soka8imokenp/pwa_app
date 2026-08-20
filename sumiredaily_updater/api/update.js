import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const publicDir = path.join(process.cwd(), 'public');
    const host = req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}`;

    // 1. Find ANY .apk file in the public directory
    let foundApkName = null;
    let foundApkSize = '7.3 MB';
    let foundApkMtime = Date.now();

    if (fs.existsSync(publicDir)) {
      const files = fs.readdirSync(publicDir);
      const apkFiles = files.filter((f) => f.toLowerCase().endsWith('.apk'));

      if (apkFiles.length > 0) {
        // Pick the most recently modified APK file or the first one
        let newestMtime = 0;
        for (const f of apkFiles) {
          try {
            const stats = fs.statSync(path.join(publicDir, f));
            if (stats.mtimeMs > newestMtime) {
              newestMtime = stats.mtimeMs;
              foundApkName = f;
              foundApkSize = (stats.size / (1024 * 1024)).toFixed(1) + ' MB';
              foundApkMtime = stats.mtimeMs;
            }
          } catch {
            if (!foundApkName) foundApkName = f;
          }
        }
      }
    }

    // Default fallback name if not found in public
    const finalApkName = foundApkName || 'Daily-Sumire-app-debug.apk';

    // 2. Read version.json if available for release notes and version string
    let versionData = {
      version: 'v1.4.0',
      releaseNotes: '• New interactive Calendar & Multi-event day planner\n• Duolingo-style animated daily streak greeting\n• High-speed direct Vercel CDN updater',
    };

    const versionFilePath = path.join(publicDir, 'version.json');
    if (fs.existsSync(versionFilePath)) {
      try {
        const custom = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
        versionData = { ...versionData, ...custom };
      } catch {
        // Fallback to default
      }
    }

    return res.status(200).json({
      version: versionData.version || 'v1.4.0',
      fileName: finalApkName,
      downloadUrl: `${baseUrl}/${finalApkName}`,
      fileSizeMb: foundApkSize || versionData.fileSize || '7.3 MB',
      releaseNotes: versionData.releaseNotes || 'New updates and improvements.',
      publishedAt: foundApkMtime,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to scan APK updates' });
  }
}
