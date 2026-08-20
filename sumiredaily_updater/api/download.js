import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      return res.status(404).send('Public directory not found');
    }

    const files = fs.readdirSync(publicDir);
    const apkFiles = files.filter((f) => f.toLowerCase().endsWith('.apk'));

    if (apkFiles.length === 0) {
      return res.status(404).send('No APK file found in public directory');
    }

    // Pick the most recently modified APK file (or the only APK)
    let newestFile = apkFiles[0];
    let newestMtime = 0;
    for (const f of apkFiles) {
      try {
        const stat = fs.statSync(path.join(publicDir, f));
        if (stat.mtimeMs > newestMtime) {
          newestMtime = stat.mtimeMs;
          newestFile = f;
        }
      } catch {
        // Fallback
      }
    }

    const filePath = path.join(publicDir, newestFile);
    const stat = fs.statSync(filePath);

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${newestFile}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    return res.status(500).send('Error streaming APK: ' + err.message);
  }
}
