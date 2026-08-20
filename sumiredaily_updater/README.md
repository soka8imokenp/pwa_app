# 🚀 Sumire Daily Updater (Vercel CDN)

Micro-service to host and distribute the latest `Daily-Sumire-latest.apk` releases with instant global CDN speeds and version check API.

---

## 📁 Project Structure

```
sumiredaily_updater/
├── api/
│   └── update.js         # Dynamic Serverless API endpoint (/api/update)
├── public/
│   ├── index.html        # Landing page with direct 1-tap APK download button
│   ├── version.json      # Metadata: version, release notes, APK file size
│   └── Daily-Sumire-latest.apk  # <-- Put your newest APK file here!
├── package.json
└── vercel.json           # CDN caching & CORS headers
```

---

## ⚡ How to Deploy on Vercel

1. Push this folder to a new repository on GitHub (e.g. `sumiredaily-updater`).
2. Go to **[vercel.com](https://vercel.com)** -> **Add New Project** -> Select this repository -> Click **Deploy**.
3. Vercel will give you a domain (e.g. `https://sumire-updater.vercel.app`).

---

## 🔄 How to Release a New Update

1. Copy your new APK to `public/Daily-Sumire-latest.apk`.
2. Update `public/version.json` with the new version (e.g. `"v1.5.0"`), file size, and release notes:
   ```json
   {
     "version": "v1.5.0",
     "fileName": "Daily-Sumire-latest.apk",
     "downloadUrl": "/Daily-Sumire-latest.apk",
     "fileSize": "7.8 MB",
     "releaseNotes": "• New features\n• Bug fixes",
     "publishedAt": "2026-08-20T12:00:00Z"
   }
   ```
3. Commit and push:
   ```bash
   git add .
   git commit -m "release: v1.5.0"
   git push origin main
   ```
4. Vercel will deploy in 5 seconds and all apps will immediately see the update!
