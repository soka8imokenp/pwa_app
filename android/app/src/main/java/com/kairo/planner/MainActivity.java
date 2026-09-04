package com.kairo.planner;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private static final String CHANNEL_ID = "daily_sumire_music_channel";
    private static final int NOTIFICATION_ID = 2026;

    public static final String ACTION_PREV = "com.kairo.planner.ACTION_PREV";
    public static final String ACTION_PLAY_PAUSE = "com.kairo.planner.ACTION_PLAY_PAUSE";
    public static final String ACTION_NEXT = "com.kairo.planner.ACTION_NEXT";

    private MediaSessionCompat mediaSession;
    private NotificationManager notificationManager;
    private MediaReceiver mediaReceiver;
    private boolean isAudioPlaying = false;
    private PowerManager.WakeLock wakeLock;

    // Native MediaPlayer for continuous 24/7 background audio playback
    private MediaPlayer nativeMediaPlayer;
    private String currentStreamUrl = null;
    private float currentVolume = 1.0f;
    private boolean isNativePrepared = false;

    private void acquireWakeLock() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DailySumire:AudioPlaybackWakeLock");
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(4 * 60 * 60 * 1000L); // 4 hours max safeguard
            }
        } catch (Exception ignored) {}
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    public void startNativeAudio(String streamUrl, String title, String artist) {
        try {
            acquireWakeLock();
            this.isAudioPlaying = true;
            showMediaNotification(title, artist, true);

            if (nativeMediaPlayer == null) {
                nativeMediaPlayer = new MediaPlayer();
                nativeMediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
                nativeMediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                );
            }

            if (streamUrl != null && streamUrl.equals(currentStreamUrl) && isNativePrepared) {
                nativeMediaPlayer.setVolume(currentVolume, currentVolume);
                nativeMediaPlayer.start();
                notifyJsAudioState(true, false);
                return;
            }

            currentStreamUrl = streamUrl;
            isNativePrepared = false;
            nativeMediaPlayer.reset();
            nativeMediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
            nativeMediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build()
            );
            nativeMediaPlayer.setDataSource(streamUrl);
            notifyJsAudioState(false, true); // buffering

            nativeMediaPlayer.setOnPreparedListener(mp -> {
                isNativePrepared = true;
                mp.setVolume(currentVolume, currentVolume);
                mp.start();
                notifyJsAudioState(true, false);
            });

            nativeMediaPlayer.setOnErrorListener((mp, what, extra) -> {
                isNativePrepared = false;
                notifyJsAudioState(false, false);
                return true;
            });

            nativeMediaPlayer.prepareAsync();
        } catch (Exception e) {
            e.printStackTrace();
            notifyJsAudioState(false, false);
        }
    }

    public void pauseNativeAudio() {
        try {
            if (nativeMediaPlayer != null && nativeMediaPlayer.isPlaying()) {
                nativeMediaPlayer.pause();
            }
            this.isAudioPlaying = false;
            releaseWakeLock();
            if (mediaSession != null && mediaSession.getController() != null && mediaSession.getController().getMetadata() != null) {
                String title = mediaSession.getController().getMetadata().getString(MediaMetadataCompat.METADATA_KEY_TITLE);
                String artist = mediaSession.getController().getMetadata().getString(MediaMetadataCompat.METADATA_KEY_ARTIST);
                showMediaNotification(title != null ? title : "Claude FM", artist != null ? artist : "Lofi Live Radio", false);
            }
            notifyJsAudioState(false, false);
        } catch (Exception ignored) {}
    }

    public void resumeNativeAudio() {
        try {
            acquireWakeLock();
            this.isAudioPlaying = true;
            if (nativeMediaPlayer != null && isNativePrepared) {
                nativeMediaPlayer.start();
                if (mediaSession != null && mediaSession.getController() != null && mediaSession.getController().getMetadata() != null) {
                    String title = mediaSession.getController().getMetadata().getString(MediaMetadataCompat.METADATA_KEY_TITLE);
                    String artist = mediaSession.getController().getMetadata().getString(MediaMetadataCompat.METADATA_KEY_ARTIST);
                    showMediaNotification(title != null ? title : "Claude FM", artist != null ? artist : "Lofi Live Radio", true);
                }
                notifyJsAudioState(true, false);
            } else if (currentStreamUrl != null) {
                String title = "Claude FM";
                String artist = "Lofi Live Radio";
                if (mediaSession != null && mediaSession.getController() != null && mediaSession.getController().getMetadata() != null) {
                    String t = mediaSession.getController().getMetadata().getString(MediaMetadataCompat.METADATA_KEY_TITLE);
                    String a = mediaSession.getController().getMetadata().getString(MediaMetadataCompat.METADATA_KEY_ARTIST);
                    if (t != null) title = t;
                    if (a != null) artist = a;
                }
                startNativeAudio(currentStreamUrl, title, artist);
            }
        } catch (Exception ignored) {}
    }

    public void stopNativeAudio() {
        try {
            this.isAudioPlaying = false;
            releaseWakeLock();
            if (nativeMediaPlayer != null) {
                try {
                    if (nativeMediaPlayer.isPlaying()) {
                        nativeMediaPlayer.stop();
                    }
                    nativeMediaPlayer.reset();
                } catch (Exception ignored) {}
            }
            isNativePrepared = false;
            currentStreamUrl = null;
        } catch (Exception ignored) {}
    }

    public void setNativeVolume(float volume) {
        this.currentVolume = Math.max(0.0f, Math.min(1.0f, volume));
        try {
            if (nativeMediaPlayer != null) {
                nativeMediaPlayer.setVolume(currentVolume, currentVolume);
            }
        } catch (Exception ignored) {}
    }

    private void notifyJsAudioState(boolean isPlaying, boolean isBuffering) {
        runOnUiThread(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "window.__onNativeAudioState && window.__onNativeAudioState(" + isPlaying + ", " + isBuffering + ");",
                        null
                    );
                }
            } catch (Exception ignored) {}
        });
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyLightSystemBars();
        configureWebView();
        initMediaSession();
        requestNotificationPermission();
        requestAudioPermission();
        requestStorageAndCameraPermissions();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyLightSystemBars();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        keepAudioAliveInBackground();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepAudioAliveInBackground();
    }

    private void keepAudioAliveInBackground() {
        try {
            if (isAudioPlaying && getBridge() != null && getBridge().getWebView() != null) {
                WebView wv = getBridge().getWebView();
                wv.onResume();
                wv.resumeTimers();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyLightSystemBars();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            stopNativeAudio();
            if (nativeMediaPlayer != null) {
                try {
                    nativeMediaPlayer.release();
                } catch (Exception ignored) {}
                nativeMediaPlayer = null;
            }
            releaseWakeLock();
            if (mediaReceiver != null) {
                unregisterReceiver(mediaReceiver);
            }
            if (mediaSession != null) {
                mediaSession.release();
            }
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
            }
        } catch (Exception ignored) {}
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    private void requestAudioPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.MODIFY_AUDIO_SETTINGS}, 102);
        }
    }

    private void requestStorageAndCameraPermissions() {
        ArrayList<String> perms = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.CAMERA);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                perms.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                perms.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }
        if (!perms.isEmpty()) {
            ActivityCompat.requestPermissions(this, perms.toArray(new String[0]), 103);
        }
    }

    private void configureWebView() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setSupportMultipleWindows(false);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setAllowContentAccess(true);
                settings.setAllowFileAccess(true);

                String ua = settings.getUserAgentString();
                if (ua != null) {
                    settings.setUserAgentString(ua.replace("; wv", "").replace("Version/4.0 ", ""));
                }

                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);

                // Note: Do not override webView.setWebChromeClient() here as Capacitor BridgeWebChromeClient
                // is needed for onShowFileChooser (file inputs and photo uploads) and permission requests.

                // Intercept OAuth redirects (localhost with access_token / id_token) and route directly to local index.html
                webView.setWebViewClient(new com.getcapacitor.BridgeWebViewClient(getBridge()) {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                        if (request != null && request.getUrl() != null) {
                            String url = request.getUrl().toString();
                            if (url.contains("access_token=") || url.contains("id_token=")) {
                                int paramIndex = url.indexOf("#");
                                if (paramIndex == -1) {
                                    paramIndex = url.indexOf("?");
                                }
                                if (paramIndex != -1) {
                                    String params = url.substring(paramIndex);
                                    if (params.startsWith("?")) {
                                        params = "#" + params.substring(1);
                                    }
                                    view.loadUrl("https://localhost/index.html" + params);
                                    return true;
                                }
                            }
                        }
                        return super.shouldOverrideUrlLoading(view, request);
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, String url) {
                        if (url != null && (url.contains("access_token=") || url.contains("id_token="))) {
                            int paramIndex = url.indexOf("#");
                            if (paramIndex == -1) {
                                paramIndex = url.indexOf("?");
                            }
                            if (paramIndex != -1) {
                                String params = url.substring(paramIndex);
                                if (params.startsWith("?")) {
                                    params = "#" + params.substring(1);
                                }
                                view.loadUrl("https://localhost/index.html" + params);
                                return true;
                            }
                        }
                        return super.shouldOverrideUrlLoading(view, url);
                    }
                });

                // Add Javascript Interfaces for Native Lock Screen, Package Installer & Native Speech Recognizer
                webView.addJavascriptInterface(new MediaJsInterface(), "AndroidMediaNotification");
                webView.addJavascriptInterface(new AppInstallerJsInterface(), "AndroidAppInstaller");
                webView.addJavascriptInterface(new SpeechRecognizerJsInterface(), "AndroidSpeechRecognizer");

                // Inject visibility spoofing so background audio (like YouTube Radio) continues when minimized
                webView.evaluateJavascript(
                    "try {" +
                    "  window.addEventListener('visibilitychange', function(e) { e.stopImmediatePropagation(); }, true);" +
                    "  document.addEventListener('visibilitychange', function(e) { e.stopImmediatePropagation(); }, true);" +
                    "  Object.defineProperty(document, 'hidden', { get: function() { return false; }, configurable: true });" +
                    "  Object.defineProperty(document, 'visibilityState', { get: function() { return 'visible'; }, configurable: true });" +
                    "} catch(e) {}",
                    null
                );
            }
        } catch (Exception ignored) {}
    }

    private void initMediaSession() {
        try {
            notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Daily Sumire Music Playback",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Shows music controls on lock screen and notification shade");
                channel.setShowBadge(false);
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                }
            }

            mediaSession = new MediaSessionCompat(this, "DailySumireMedia");
            mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
            mediaSession.setActive(true);

            mediaReceiver = new MediaReceiver();
            IntentFilter filter = new IntentFilter();
            filter.addAction(ACTION_PREV);
            filter.addAction(ACTION_PLAY_PAUSE);
            filter.addAction(ACTION_NEXT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(mediaReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(mediaReceiver, filter);
            }
        } catch (Exception ignored) {}
    }

    public void showMediaNotification(String title, String artist, boolean isPlaying) {
        try {
            if (notificationManager == null || mediaSession == null) return;

            this.isAudioPlaying = isPlaying;
            if (isPlaying) {
                acquireWakeLock();
            } else {
                releaseWakeLock();
            }

            PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                    .setActions(
                            PlaybackStateCompat.ACTION_PLAY |
                            PlaybackStateCompat.ACTION_PAUSE |
                            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                            PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                    )
                    .setState(
                            isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                            PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN,
                            1.0f
                    );
            mediaSession.setPlaybackState(stateBuilder.build());

            MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
                    .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                    .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                    .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Daily Sumire");
            mediaSession.setMetadata(metaBuilder.build());

            Intent openAppIntent = new Intent(this, MainActivity.class);
            PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                    this, 0, openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent prevIntent = new Intent(ACTION_PREV);
            PendingIntent prevPendingIntent = PendingIntent.getBroadcast(
                    this, 1, prevIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent playPauseIntent = new Intent(ACTION_PLAY_PAUSE);
            PendingIntent playPausePendingIntent = PendingIntent.getBroadcast(
                    this, 2, playPauseIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent nextIntent = new Intent(ACTION_NEXT);
            PendingIntent nextPendingIntent = PendingIntent.getBroadcast(
                    this, 3, nextIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Bitmap iconBitmap = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
            int playPauseIcon = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle(title)
                    .setContentText(artist)
                    .setSubText("Daily Sumire Music")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setLargeIcon(iconBitmap)
                    .setContentIntent(openAppPendingIntent)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setOngoing(isPlaying)
                    .setOnlyAlertOnce(true)
                    .addAction(android.R.drawable.ic_media_previous, "Prev", prevPendingIntent)
                    .addAction(playPauseIcon, isPlaying ? "Pause" : "Play", playPausePendingIntent)
                    .addAction(android.R.drawable.ic_media_next, "Next", nextPendingIntent)
                    .setStyle(
                            new androidx.media.app.NotificationCompat.MediaStyle()
                                     .setMediaSession(mediaSession.getSessionToken())
                                    .setShowActionsInCompactView(0, 1, 2)
                    );

            notificationManager.notify(NOTIFICATION_ID, builder.build());
        } catch (Exception ignored) {}
    }

    public void cancelMediaNotification() {
        try {
            this.isAudioPlaying = false;
            releaseWakeLock();
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
            }
        } catch (Exception ignored) {}
    }

    public class MediaJsInterface {
        @JavascriptInterface
        public void updateMedia(String title, String artist, boolean isPlaying) {
            runOnUiThread(() -> {
                MainActivity.this.isAudioPlaying = isPlaying;
                if (isPlaying) {
                    acquireWakeLock();
                } else {
                    releaseWakeLock();
                }
                showMediaNotification(title, artist, isPlaying);
            });
        }

        @JavascriptInterface
        public void clearMedia() {
            runOnUiThread(() -> {
                stopNativeAudio();
                cancelMediaNotification();
            });
        }

        @JavascriptInterface
        public void playStream(String streamUrl, String title, String artist) {
            runOnUiThread(() -> startNativeAudio(streamUrl, title, artist));
        }

        @JavascriptInterface
        public void pauseAudio() {
            runOnUiThread(() -> pauseNativeAudio());
        }

        @JavascriptInterface
        public void resumeAudio() {
            runOnUiThread(() -> resumeNativeAudio());
        }

        @JavascriptInterface
        public void stopAudio() {
            runOnUiThread(() -> stopNativeAudio());
        }

        @JavascriptInterface
        public void setVolume(float volume) {
            runOnUiThread(() -> setNativeVolume(volume));
        }
    }

    public class AppInstallerJsInterface {
        @JavascriptInterface
        public void installApkBase64(String base64Data, String fileName) {
            new Thread(() -> {
                try {
                    byte[] apkBytes = Base64.decode(base64Data, Base64.DEFAULT);
                    File cacheDir = new File(getCacheDir(), "apk_updates");
                    if (!cacheDir.exists()) {
                        cacheDir.mkdirs();
                    }
                    File apkFile = new File(cacheDir, (fileName != null && !fileName.isEmpty()) ? fileName : "Daily-Sumire-update.apk");
                    FileOutputStream fos = new FileOutputStream(apkFile);
                    fos.write(apkBytes);
                    fos.flush();
                    fos.close();

                    runOnUiThread(() -> {
                        launchPackageInstaller(apkFile);
                    });
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }

        @JavascriptInterface
        public void downloadAndInstall(String downloadUrl, String fileName) {
            new Thread(() -> {
                try {
                    URL url = new URL(downloadUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(true);
                    conn.setRequestProperty("User-Agent", "DailySumireApp/1.4.0");
                    conn.connect();

                    int responseCode = conn.getResponseCode();
                    if (responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == 307 || responseCode == 308) {
                        String newUrl = conn.getHeaderField("Location");
                        if (newUrl != null && !newUrl.isEmpty()) {
                            conn = (HttpURLConnection) new URL(newUrl).openConnection();
                            conn.setRequestProperty("User-Agent", "DailySumireApp/1.4.0");
                            conn.connect();
                        }
                    }

                    File cacheDir = new File(getCacheDir(), "apk_updates");
                    if (!cacheDir.exists()) {
                        cacheDir.mkdirs();
                    }
                    File apkFile = new File(cacheDir, (fileName != null && !fileName.isEmpty()) ? fileName : "Daily-Sumire-update.apk");

                    InputStream in = conn.getInputStream();
                    FileOutputStream fos = new FileOutputStream(apkFile);
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        fos.write(buffer, 0, bytesRead);
                    }
                    fos.flush();
                    fos.close();
                    in.close();

                    runOnUiThread(() -> {
                        launchPackageInstaller(apkFile);
                    });
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }

    public class SpeechRecognizerJsInterface {
        private SpeechRecognizer speechRecognizer;
        private Intent currentIntent;
        private boolean isContinuousActive = false;

        @JavascriptInterface
        public void startDictation(String lang) {
            startDictation(lang, true);
        }

        @JavascriptInterface
        public void startDictation(String lang, boolean continuous) {
            runOnUiThread(() -> {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.MODIFY_AUDIO_SETTINGS}, 102);
                    notifyJs("window.onAndroidSpeechError && window.onAndroidSpeechError('Please grant microphone permission in Settings');");
                    return;
                }

                try {
                    isContinuousActive = continuous;

                    if (speechRecognizer != null) {
                        try {
                            speechRecognizer.destroy();
                        } catch (Exception ignored) {}
                    }

                    String defaultTag = Locale.getDefault().toLanguageTag();
                    String targetLang = (lang != null && !lang.isEmpty() && !"auto".equalsIgnoreCase(lang)) ? lang : defaultTag;

                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(MainActivity.this);
                    currentIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    currentIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    currentIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, targetLang);
                    currentIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, targetLang);
                    currentIntent.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, false);
                    currentIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                    currentIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);

                    // Bilingual / Multi-language support: enable both Russian & English simultaneously
                    ArrayList<String> extraLanguages = new ArrayList<>();
                    extraLanguages.add("ru-RU");
                    extraLanguages.add("en-US");
                    if (!"ru-RU".equals(targetLang) && !"en-US".equals(targetLang)) {
                        extraLanguages.add(targetLang);
                    }
                    currentIntent.putStringArrayListExtra("android.speech.extra.EXTRA_ADDITIONAL_LANGUAGES", extraLanguages);

                    // Extended silence detection thresholds: don't cut off on brief pauses
                    currentIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 3500L);
                    currentIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L);
                    currentIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 1500L);

                    speechRecognizer.setRecognitionListener(new RecognitionListener() {
                        @Override
                        public void onReadyForSpeech(Bundle params) {
                            notifyJs("window.onAndroidSpeechReady && window.onAndroidSpeechReady();");
                        }

                        @Override
                        public void onBeginningOfSpeech() {}

                        @Override
                        public void onRmsChanged(float rmsdB) {}

                        @Override
                        public void onBufferReceived(byte[] buffer) {}

                        @Override
                        public void onEndOfSpeech() {}

                        @Override
                        public void onError(int error) {
                            // In continuous mode, silence or no-match is non-fatal: restart listening if still active
                            if (isContinuousActive && (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT)) {
                                if (speechRecognizer != null && currentIntent != null) {
                                    try {
                                        speechRecognizer.startListening(currentIntent);
                                        return;
                                    } catch (Exception ignored) {}
                                }
                            }

                            String msg = "Voice recognition error: " + error;
                            if (error == SpeechRecognizer.ERROR_NO_MATCH) msg = "No speech detected";
                            else if (error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) msg = "Speech timeout";
                            else if (error == SpeechRecognizer.ERROR_AUDIO) msg = "Audio recording error";
                            else if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) msg = "Microphone permission required";
                            notifyJs("window.onAndroidSpeechError && window.onAndroidSpeechError('" + msg + "');");
                        }

                        @Override
                        public void onResults(Bundle results) {
                            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                            if (matches != null && !matches.isEmpty()) {
                                String text = matches.get(0).replace("'", "\\'").replace("\n", " ");
                                notifyJs("window.onAndroidSpeechResult && window.onAndroidSpeechResult('" + text + "', true);");
                            }

                            if (isContinuousActive && speechRecognizer != null && currentIntent != null) {
                                try {
                                    speechRecognizer.startListening(currentIntent);
                                } catch (Exception e) {
                                    notifyJs("window.onAndroidSpeechEnd && window.onAndroidSpeechEnd();");
                                }
                            } else {
                                notifyJs("window.onAndroidSpeechEnd && window.onAndroidSpeechEnd();");
                            }
                        }

                        @Override
                        public void onPartialResults(Bundle partialResults) {
                            ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                            if (matches != null && !matches.isEmpty()) {
                                String text = matches.get(0).replace("'", "\\'").replace("\n", " ");
                                notifyJs("window.onAndroidSpeechResult && window.onAndroidSpeechResult('" + text + "', false);");
                            }
                        }

                        @Override
                        public void onEvent(int eventType, Bundle params) {}
                    });

                    speechRecognizer.startListening(currentIntent);
                } catch (Exception e) {
                    e.printStackTrace();
                    notifyJs("window.onAndroidSpeechError && window.onAndroidSpeechError('" + e.getMessage() + "');");
                }
            });
        }

        @JavascriptInterface
        public void stopDictation() {
            runOnUiThread(() -> {
                isContinuousActive = false;
                if (speechRecognizer != null) {
                    try {
                        speechRecognizer.stopListening();
                    } catch (Exception ignored) {}
                }
            });
        }

        private void notifyJs(String jsCode) {
            runOnUiThread(() -> {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(jsCode, null);
                    }
                } catch (Exception ignored) {}
            });
        }
    }

    private void launchPackageInstaller(File apkFile) {
        try {
            Uri apkUri = FileProvider.getUriForFile(
                    this,
                    getPackageName() + ".fileprovider",
                    apkFile
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(intent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public class MediaReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (action == null) return;

            runOnUiThread(() -> {
                try {
                    if (ACTION_PLAY_PAUSE.equals(action)) {
                        if (nativeMediaPlayer != null && isNativePrepared) {
                            if (nativeMediaPlayer.isPlaying()) {
                                pauseNativeAudio();
                            } else {
                                resumeNativeAudio();
                            }
                        } else if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().evaluateJavascript("window.__sumireTogglePlay && window.__sumireTogglePlay();", null);
                        }
                    } else if (ACTION_PREV.equals(action)) {
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().evaluateJavascript("window.__sumirePrevTrack && window.__sumirePrevTrack();", null);
                        }
                    } else if (ACTION_NEXT.equals(action)) {
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().evaluateJavascript("window.__sumireNextTrack && window.__sumireNextTrack();", null);
                        }
                    }
                } catch (Exception ignored) {}
            });
        }
    }

    private void applyLightSystemBars() {
        try {
            int creamColor = Color.parseColor("#FAF7F2");
            getWindow().setStatusBarColor(creamColor);
            getWindow().setNavigationBarColor(creamColor);

            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(true);
                controller.setAppearanceLightNavigationBars(true);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController insetsController = getWindow().getInsetsController();
                if (insetsController != null) {
                    insetsController.setSystemBarsAppearance(
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                    );
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decorView = getWindow().getDecorView();
                int flags = decorView.getSystemUiVisibility();
                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                decorView.setSystemUiVisibility(flags);
            }
        } catch (Exception ignored) {}
    }
}
