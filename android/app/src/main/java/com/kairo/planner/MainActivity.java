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
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyLightSystemBars();
        configureWebView();
        initMediaSession();
        requestNotificationPermission();
        requestAudioPermission();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyLightSystemBars();
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

    private void configureWebView() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setSupportMultipleWindows(true);
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

                // Allow Web Audio capture in WebChromeClient
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        runOnUiThread(() -> {
                            try {
                                request.grant(request.getResources());
                            } catch (Exception ignored) {}
                        });
                    }
                });

                // Add Javascript Interfaces for Native Lock Screen, Package Installer & Native Speech Recognizer
                webView.addJavascriptInterface(new MediaJsInterface(), "AndroidMediaNotification");
                webView.addJavascriptInterface(new AppInstallerJsInterface(), "AndroidAppInstaller");
                webView.addJavascriptInterface(new SpeechRecognizerJsInterface(), "AndroidSpeechRecognizer");
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
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
            }
        } catch (Exception ignored) {}
    }

    public class MediaJsInterface {
        @JavascriptInterface
        public void updateMedia(String title, String artist, boolean isPlaying) {
            runOnUiThread(() -> showMediaNotification(title, artist, isPlaying));
        }

        @JavascriptInterface
        public void clearMedia() {
            runOnUiThread(() -> cancelMediaNotification());
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

        @JavascriptInterface
        public void startDictation(String lang) {
            runOnUiThread(() -> {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.MODIFY_AUDIO_SETTINGS}, 102);
                    notifyJs("window.onAndroidSpeechError && window.onAndroidSpeechError('Please grant microphone permission in Settings');");
                    return;
                }

                try {
                    if (speechRecognizer != null) {
                        try {
                            speechRecognizer.destroy();
                        } catch (Exception ignored) {}
                    }

                    String targetLang = (lang != null && !lang.isEmpty()) ? lang : Locale.getDefault().toLanguageTag();
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(MainActivity.this);
                    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, targetLang);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, targetLang);
                    intent.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, false);
                    intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                    intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);

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
                        public void onEndOfSpeech() {
                            notifyJs("window.onAndroidSpeechEnd && window.onAndroidSpeechEnd();");
                        }

                        @Override
                        public void onError(int error) {
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
                            notifyJs("window.onAndroidSpeechEnd && window.onAndroidSpeechEnd();");
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

                    speechRecognizer.startListening(intent);
                } catch (Exception e) {
                    e.printStackTrace();
                    notifyJs("window.onAndroidSpeechError && window.onAndroidSpeechError('" + e.getMessage() + "');");
                }
            });
        }

        @JavascriptInterface
        public void stopDictation() {
            runOnUiThread(() -> {
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
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        WebView webView = getBridge().getWebView();
                        if (ACTION_PLAY_PAUSE.equals(action)) {
                            webView.evaluateJavascript("window.__sumireTogglePlay && window.__sumireTogglePlay();", null);
                        } else if (ACTION_PREV.equals(action)) {
                            webView.evaluateJavascript("window.__sumirePrevTrack && window.__sumirePrevTrack();", null);
                        } else if (ACTION_NEXT.equals(action)) {
                            webView.evaluateJavascript("window.__sumireNextTrack && window.__sumireNextTrack();", null);
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
