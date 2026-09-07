package com.kairo.planner;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;

public class MediaPlaybackService extends Service {
    public static final String CHANNEL_ID = "daily_sumire_music_channel";
    public static final int NOTIFICATION_ID = 2026;

    public static final String ACTION_PLAY = "com.kairo.planner.ACTION_SERVICE_PLAY";
    public static final String ACTION_PAUSE = "com.kairo.planner.ACTION_SERVICE_PAUSE";
    public static final String ACTION_RESUME = "com.kairo.planner.ACTION_SERVICE_RESUME";
    public static final String ACTION_STOP = "com.kairo.planner.ACTION_SERVICE_STOP";
    public static final String ACTION_SET_VOLUME = "com.kairo.planner.ACTION_SERVICE_SET_VOLUME";

    public static final String ACTION_PREV = "com.kairo.planner.ACTION_PREV";
    public static final String ACTION_PLAY_PAUSE = "com.kairo.planner.ACTION_PLAY_PAUSE";
    public static final String ACTION_NEXT = "com.kairo.planner.ACTION_NEXT";

    public static final String EXTRA_STREAM_URL = "extra_stream_url";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_VOLUME = "extra_volume";

    public interface StateListener {
        void onStateChanged(boolean isPlaying, boolean isBuffering);
    }

    public interface TrackNavigationListener {
        void onNext();
        void onPrev();
    }

    private static StateListener stateListener;
    private static TrackNavigationListener trackNavigationListener;

    public static void setStateListener(StateListener listener) {
        stateListener = listener;
    }

    public static void setTrackNavigationListener(TrackNavigationListener listener) {
        trackNavigationListener = listener;
    }

    private MediaPlayer mediaPlayer;
    private MediaSessionCompat mediaSession;
    private NotificationManager notificationManager;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private MediaControlReceiver controlReceiver;

    private String currentStreamUrl = null;
    private String currentTitle = "Claude FM";
    private String currentArtist = "24/7 Lofi Live Radio";
    private float currentVolume = 1.0f;
    private boolean isPrepared = false;
    private boolean userWantsPlaying = false;

    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        initLocks();
        initNotificationChannel();
        initMediaSession();
        registerControlReceiver();
    }

    private void initLocks() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DailySumire:MediaServiceWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception ignored) {}

        try {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null) {
                wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "DailySumire:MediaServiceWifiLock");
                wifiLock.setReferenceCounted(false);
            }
        } catch (Exception ignored) {}
    }

    private void acquireLocks() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(12 * 60 * 60 * 1000L); // 12 hours safeguard
            }
            if (wifiLock != null && !wifiLock.isHeld()) {
                wifiLock.acquire();
            }
        } catch (Exception ignored) {}
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
            }
        } catch (Exception ignored) {}
    }

    private void initNotificationChannel() {
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Daily Sumire Music Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Continuous 24/7 background audio and lock screen controls");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void initMediaSession() {
        try {
            mediaSession = new MediaSessionCompat(this, "DailySumireMediaService");
            mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
            mediaSession.setActive(true);
        } catch (Exception ignored) {}
    }

    private void registerControlReceiver() {
        try {
            controlReceiver = new MediaControlReceiver();
            IntentFilter filter = new IntentFilter();
            filter.addAction(ACTION_PREV);
            filter.addAction(ACTION_PLAY_PAUSE);
            filter.addAction(ACTION_NEXT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(controlReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(controlReceiver, filter);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();
        if (ACTION_PLAY.equals(action)) {
            String url = intent.getStringExtra(EXTRA_STREAM_URL);
            String title = intent.getStringExtra(EXTRA_TITLE);
            String artist = intent.getStringExtra(EXTRA_ARTIST);
            if (title != null) currentTitle = title;
            if (artist != null) currentArtist = artist;

            Notification notif = buildNotification(currentTitle, currentArtist, true);
            startForegroundWithNotification(notif);

            if (url != null) {
                startStreaming(url, currentTitle, currentArtist);
            }
        } else if (ACTION_PAUSE.equals(action)) {
            pausePlayback();
        } else if (ACTION_RESUME.equals(action)) {
            resumePlayback();
        } else if (ACTION_STOP.equals(action)) {
            stopPlayback();
        } else if (ACTION_SET_VOLUME.equals(action)) {
            float vol = intent.getFloatExtra(EXTRA_VOLUME, 1.0f);
            setVolumeInternal(vol);
        }

        return START_NOT_STICKY;
    }

    private void startForegroundWithNotification(Notification notification) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void startStreaming(String streamUrl, String title, String artist) {
        try {
            userWantsPlaying = true;
            acquireLocks();

            if (mediaPlayer == null) {
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
                mediaPlayer.setAudioAttributes(
                        new AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .build()
                );
            }

            if (streamUrl.equals(currentStreamUrl) && isPrepared) {
                mediaPlayer.setVolume(currentVolume, currentVolume);
                mediaPlayer.start();
                updateNotification(true);
                notifyJs(true, false);
                return;
            }

            currentStreamUrl = streamUrl;
            isPrepared = false;
            mediaPlayer.reset();
            mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
            mediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .build()
            );
            mediaPlayer.setDataSource(streamUrl);
            notifyJs(false, true); // Buffering

            mediaPlayer.setOnPreparedListener(mp -> {
                isPrepared = true;
                if (userWantsPlaying) {
                    mp.setVolume(currentVolume, currentVolume);
                    mp.start();
                    updateNotification(true);
                    notifyJs(true, false);
                }
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                isPrepared = false;
                notifyJs(false, false);
                if (userWantsPlaying && currentStreamUrl != null) {
                    handler.postDelayed(() -> {
                        if (userWantsPlaying && currentStreamUrl != null) {
                            startStreaming(currentStreamUrl, currentTitle, currentArtist);
                        }
                    }, 2000);
                }
                return true;
            });

            mediaPlayer.prepareAsync();
        } catch (Exception e) {
            e.printStackTrace();
            notifyJs(false, false);
        }
    }

    private void pausePlayback() {
        try {
            userWantsPlaying = false;
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                mediaPlayer.pause();
            }
            releaseLocks();
            updateNotification(false);
            notifyJs(false, false);
        } catch (Exception ignored) {}
    }

    private void resumePlayback() {
        try {
            userWantsPlaying = true;
            acquireLocks();

            Notification notif = buildNotification(currentTitle, currentArtist, true);
            startForegroundWithNotification(notif);

            if (mediaPlayer != null && isPrepared) {
                mediaPlayer.start();
                updateNotification(true);
                notifyJs(true, false);
            } else if (currentStreamUrl != null) {
                startStreaming(currentStreamUrl, currentTitle, currentArtist);
            }
        } catch (Exception ignored) {}
    }

    private void stopPlayback() {
        try {
            userWantsPlaying = false;
            releaseLocks();
            if (mediaPlayer != null) {
                try {
                    if (mediaPlayer.isPlaying()) {
                        mediaPlayer.stop();
                    }
                    mediaPlayer.reset();
                } catch (Exception ignored) {}
            }
            isPrepared = false;
            currentStreamUrl = null;
            notifyJs(false, false);
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
        } catch (Exception ignored) {}
    }

    private void setVolumeInternal(float volume) {
        currentVolume = Math.max(0.0f, Math.min(1.0f, volume));
        if (mediaPlayer != null) {
            try {
                mediaPlayer.setVolume(currentVolume, currentVolume);
            } catch (Exception ignored) {}
        }
    }

    private void updateNotification(boolean isPlaying) {
        try {
            Notification notif = buildNotification(currentTitle, currentArtist, isPlaying);
            if (notificationManager != null) {
                notificationManager.notify(NOTIFICATION_ID, notif);
            }
        } catch (Exception ignored) {}
    }

    private Notification buildNotification(String title, String artist, boolean isPlaying) {
        if (mediaSession != null) {
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
        }

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
                .addAction(android.R.drawable.ic_media_next, "Next", nextPendingIntent);

        if (mediaSession != null) {
            builder.setStyle(
                    new androidx.media.app.NotificationCompat.MediaStyle()
                            .setMediaSession(mediaSession.getSessionToken())
                            .setShowActionsInCompactView(0, 1, 2)
            );
        }

        return builder.build();
    }

    private void notifyJs(boolean isPlaying, boolean isBuffering) {
        if (stateListener != null) {
            handler.post(() -> {
                if (stateListener != null) {
                    stateListener.onStateChanged(isPlaying, isBuffering);
                }
            });
        }
    }

    public class MediaControlReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (action == null) return;

            if (ACTION_PLAY_PAUSE.equals(action)) {
                if (mediaPlayer != null && isPrepared && mediaPlayer.isPlaying()) {
                    pausePlayback();
                } else {
                    resumePlayback();
                }
            } else if (ACTION_NEXT.equals(action)) {
                if (trackNavigationListener != null) {
                    trackNavigationListener.onNext();
                }
            } else if (ACTION_PREV.equals(action)) {
                if (trackNavigationListener != null) {
                    trackNavigationListener.onPrev();
                }
            }
        }
    }

    public static void startPlay(Context context, String streamUrl, String title, String artist) {
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(ACTION_PLAY);
        intent.putExtra(EXTRA_STREAM_URL, streamUrl);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_ARTIST, artist);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void pause(Context context) {
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(ACTION_PAUSE);
        context.startService(intent);
    }

    public static void resume(Context context) {
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(ACTION_RESUME);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void stop(Context context) {
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(ACTION_STOP);
        context.startService(intent);
    }

    public static void setVolume(Context context, float volume) {
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(ACTION_SET_VOLUME);
        intent.putExtra(EXTRA_VOLUME, volume);
        context.startService(intent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            stopPlayback();
            if (mediaPlayer != null) {
                mediaPlayer.release();
                mediaPlayer = null;
            }
            if (controlReceiver != null) {
                unregisterReceiver(controlReceiver);
            }
            if (mediaSession != null) {
                mediaSession.release();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
