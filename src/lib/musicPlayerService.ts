import { RadioStation, PRESET_STATIONS } from '../types/radio';
import { Track } from '../data/playlist';

export interface MusicPlayerState {
  // Backwards compatibility with Track interface
  playlist: Track[];
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  isRepeat: boolean;

  // Lofi Radio Specific State
  stations: RadioStation[];
  currentStation: RadioStation;
  volume: number; // 0 to 100
  isMuted: boolean;
  isBuffering: boolean;
  isApiReady: boolean;
  isVideoVisible: boolean;
}

type Listener = (state: MusicPlayerState) => void;

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function stationToTrack(station: RadioStation): Track {
  return {
    id: station.id,
    title: station.name,
    artist: station.subtitle || '24/7 Lofi Live Radio',
    duration: 'LIVE',
    coverUrl: station.thumbnailUrl,
    audioUrl: station.streamUrl || (station.videoId ? `https://www.youtube.com/watch?v=${station.videoId}` : ''),
  };
}

class MusicPlayerService {
  private ytPlayer: any = null;
  private audio: HTMLAudioElement | null = null;
  private isPlayerReady: boolean = false;
  private pendingPlay: boolean = false;
  private userIntentPlay: boolean = false;
  private listeners: Set<Listener> = new Set();
  private hostElement: HTMLElement | null = null;
  private isInitializing: boolean = false;

  private state: MusicPlayerState;

  constructor() {
    let initialStations = [...PRESET_STATIONS];
    let savedStation = PRESET_STATIONS[0];
    let savedVolume = 80;

    if (typeof window !== 'undefined') {
      try {
        // Prevent visibilitychange from pausing media when app is minimized or screen is locked
        window.addEventListener('visibilitychange', (e) => {
          e.stopImmediatePropagation();
        }, true);
        document.addEventListener('visibilitychange', (e) => {
          e.stopImmediatePropagation();
        }, true);

        try {
          Object.defineProperty(document, 'hidden', {
            get: () => false,
            configurable: true,
          });
          Object.defineProperty(document, 'visibilityState', {
            get: () => 'visible',
            configurable: true,
          });
        } catch {}

        const activeStationsRaw = localStorage.getItem('kairo_radio_active_stations');
        if (activeStationsRaw) {
          const parsed = JSON.parse(activeStationsRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Migrate presets to ensure streamUrl & latest video IDs are present
            initialStations = parsed.map((station: RadioStation) => {
              const defaultPreset = PRESET_STATIONS.find(p => p.id === station.id);
              if (defaultPreset) {
                return {
                  ...station,
                  streamUrl: defaultPreset.streamUrl,
                  videoId: defaultPreset.videoId,
                  isLive: defaultPreset.isLive,
                };
              }
              return station;
            });
          }
        } else {
          const customRaw = localStorage.getItem('kairo_radio_custom_stations');
          if (customRaw) {
            const parsed = JSON.parse(customRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialStations = [...PRESET_STATIONS, ...parsed];
            }
          }
        }

        const savedStationId = localStorage.getItem('kairo_radio_current_station_id');
        if (savedStationId) {
          const match = initialStations.find(s => s.id === savedStationId);
          if (match) savedStation = match;
        }

        const volRaw = localStorage.getItem('kairo_radio_volume');
        if (volRaw) {
          const parsedVol = Number(volRaw);
          if (!isNaN(parsedVol)) {
            savedVolume = Math.max(0, Math.min(100, parsedVol));
          }
        }
      } catch {
        // ignore fallback
      }

      // Expose global methods for native Android BroadcastReceiver
      (window as any).__sumireTogglePlay = () => this.togglePlay();
      (window as any).__sumireNextTrack = () => this.nextTrack();
      (window as any).__sumirePrevTrack = () => this.prevTrack();
    }

    const currentTrack = stationToTrack(savedStation);
    const currentIndex = initialStations.findIndex(s => s.id === savedStation.id);

    this.state = {
      playlist: initialStations.map(stationToTrack),
      currentIndex: currentIndex >= 0 ? currentIndex : 0,
      currentTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isShuffle: false,
      isRepeat: false,
      stations: initialStations,
      currentStation: savedStation,
      volume: savedVolume,
      isMuted: false,
      isBuffering: false,
      isApiReady: false,
      isVideoVisible: false,
    };

    if (typeof window !== 'undefined') {
      (window as any).__onNativeAudioState = (isPlaying: boolean, isBuffering: boolean) => {
        this.state.isPlaying = isPlaying;
        this.state.isBuffering = isBuffering;
        this.notify();
      };
      (window as any).__sumireTogglePlay = () => {
        this.togglePlay();
      };
      (window as any).__sumireNextTrack = () => {
        this.nextStation();
      };
      (window as any).__sumirePrevTrack = () => {
        this.previousStation();
      };

      if (document.readyState === 'complete') {
        this.initYouTubeApi();
      } else {
        window.addEventListener('load', () => this.initYouTubeApi(), { once: true });
      }
    }
  }

  private initAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const audio = new Audio();
    audio.preload = 'auto';

    audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.state.isBuffering = false;
      this.syncMediaSession();
      this.syncNativeNotification();
      this.notify();
    });

    audio.addEventListener('pause', () => {
      if (this.userIntentPlay) {
        // System / minimization blur event attempted to pause stream
        setTimeout(() => {
          if (this.userIntentPlay && this.audio && this.audio.paused) {
            this.audio.play().catch(() => {});
          }
        }, 50);
        return;
      }
      this.state.isPlaying = false;
      this.syncMediaSession();
      this.syncNativeNotification();
      this.notify();
    });

    audio.addEventListener('waiting', () => {
      this.state.isBuffering = true;
      this.notify();
    });

    audio.addEventListener('playing', () => {
      this.state.isBuffering = false;
      this.state.isPlaying = true;
      this.notify();
    });

    audio.addEventListener('error', (e) => {
      console.warn('[Sumire Radio] Native audio stream error:', e);
      this.state.isBuffering = false;
      this.notify();
    });

    this.audio = audio;
    return audio;
  }

  private getOrCreateHostContainer(): HTMLElement {
    if (this.hostElement && document.body.contains(this.hostElement)) {
      return this.hostElement;
    }

    let host = document.getElementById('sumire-lofi-radio-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sumire-lofi-radio-host';
      host.style.position = 'fixed';
      host.style.bottom = '-9999px';
      host.style.left = '-9999px';
      host.style.width = '240px';
      host.style.height = '140px';
      host.style.opacity = '0.001';
      host.style.pointerEvents = 'none';
      host.style.zIndex = '-999';

      const playerDiv = document.createElement('div');
      playerDiv.id = 'sumire-yt-player-target';
      playerDiv.style.width = '100%';
      playerDiv.style.height = '100%';
      host.appendChild(playerDiv);

      document.body.appendChild(host);
    }

    this.hostElement = host;
    return host;
  }

  public initYouTubeApi(): void {
    if (typeof window === 'undefined' || this.isInitializing || this.ytPlayer) return;
    this.isInitializing = true;

    this.getOrCreateHostContainer();

    const onApiLoaded = () => {
      this.state.isApiReady = true;
      this.notify();
      this.createPlayer();
    };

    if ((window as any).YT && (window as any).YT.Player) {
      onApiLoaded();
      return;
    }

    const prevCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (prevCallback) {
        try { prevCallback(); } catch {}
      }
      onApiLoaded();
    };

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }

  private createPlayer(): void {
    if (typeof window === 'undefined' || this.ytPlayer) return;
    const target = document.getElementById('sumire-yt-player-target');
    if (!target) return;

    try {
      const initialVid = this.state.currentStation.videoId || 'tRsQsTMvPNg';
      this.ytPlayer = new (window as any).YT.Player('sumire-yt-player-target', {
        height: '100%',
        width: '100%',
        videoId: initialVid,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            this.isPlayerReady = true;
            this.state.isApiReady = true;
            try {
              event.target.setVolume(this.state.volume);
              if (this.state.isMuted) {
                event.target.mute();
              }
            } catch {}

            if (this.pendingPlay) {
              this.pendingPlay = false;
              this.play();
            }
            this.notify();
          },
          onStateChange: (event: any) => {
            const YT = (window as any).YT;
            if (!YT) return;

            if (event.data === YT.PlayerState.PLAYING) {
              this.state.isPlaying = true;
              this.state.isBuffering = false;
              this.syncMediaSession();
              this.syncNativeNotification();
              this.notify();
            } else if (event.data === YT.PlayerState.PAUSED) {
              if (this.userIntentPlay && !this.state.currentStation.streamUrl) {
                // Background minimize or visibility change attempted to pause stream
                setTimeout(() => {
                  if (this.userIntentPlay && this.ytPlayer) {
                    try {
                      this.ytPlayer.playVideo();
                    } catch {}
                  }
                }, 80);
                return;
              }
              this.state.isPlaying = false;
              this.state.isBuffering = false;
              this.syncMediaSession();
              this.syncNativeNotification();
              this.notify();
            } else if (event.data === YT.PlayerState.BUFFERING) {
              this.state.isBuffering = true;
              this.notify();
            } else if (event.data === YT.PlayerState.ENDED) {
              this.play();
            }
          },
          onError: (err: any) => {
            console.warn('[Sumire Lofi Radio] YouTube player event error:', err);
            this.state.isBuffering = false;
            this.notify();
          },
        },
      });
    } catch (e) {
      console.warn('[Sumire Lofi Radio] Failed to create YouTube player instance:', e);
    }
  }

  private syncNativeNotification() {
    if (typeof window !== 'undefined') {
      const nativeNotification = (window as any).AndroidMediaNotification;
      if (nativeNotification && this.state.currentStation) {
        try {
          nativeNotification.updateMedia(
            this.state.currentStation.name,
            this.state.currentStation.subtitle || '24/7 Lofi Live Radio',
            this.state.isPlaying
          );
        } catch {
          // ignore
        }
      }
    }
  }

  private syncMediaSession() {
    if (typeof window === 'undefined') return;
    this.syncNativeNotification();

    if ('mediaSession' in navigator && this.state.currentStation) {
      const station = this.state.currentStation;
      const origin = window.location.origin;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: station.name,
        artist: station.subtitle || '24/7 Lofi Live Radio',
        album: 'Daily Sumire Radio',
        artwork: [
          { src: station.thumbnailUrl, sizes: '480x360', type: 'image/jpeg' },
          { src: `${origin}/icon-192x192.png`, sizes: '192x192', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = this.state.isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevStation());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextStation());
      navigator.mediaSession.setActionHandler('stop', () => this.pause());
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((fn) => fn(currentState));
  }

  public getState(): MusicPlayerState {
    return { ...this.state };
  }

  public play() {
    this.userIntentPlay = true;

    // 1. Android Native MediaPlayer (runs outside WebView in Android OS media framework, 0% drop on background/lock)
    const nativeMedia = typeof window !== 'undefined' ? (window as any).AndroidMediaNotification : null;
    if (nativeMedia && typeof nativeMedia.playStream === 'function' && this.state.currentStation.streamUrl) {
      try {
        nativeMedia.setVolume(this.state.isMuted ? 0 : this.state.volume / 100);
        nativeMedia.playStream(
          this.state.currentStation.streamUrl,
          this.state.currentStation.name,
          this.state.currentStation.subtitle || '24/7 Lofi Live Radio'
        );
        this.state.isPlaying = true;
        this.syncMediaSession();
        this.notify();
        return;
      } catch (e) {
        console.warn('[Sumire Radio] Android native audio failed, falling back to HTML5 audio:', e);
      }
    }

    // 2. Direct audio stream (100% background playback in mobile WebView & screen lock)
    if (this.state.currentStation.streamUrl) {
      const audio = this.initAudio();
      if (!audio.src || !audio.src.includes(this.state.currentStation.streamUrl)) {
        audio.src = this.state.currentStation.streamUrl;
      }
      audio.volume = this.state.isMuted ? 0 : this.state.volume / 100;
      audio.play().then(() => {
        this.state.isPlaying = true;
        this.syncMediaSession();
        this.syncNativeNotification();
        this.notify();
      }).catch(() => {
        this.state.isPlaying = false;
        this.notify();
      });
      return;
    }

    // 3. YouTube playback
    if (!this.ytPlayer || !this.isPlayerReady) {
      this.pendingPlay = true;
      this.state.isPlaying = true;
      this.notify();
      this.initYouTubeApi();
      return;
    }

    try {
      this.ytPlayer.playVideo();
      this.state.isPlaying = true;
      this.syncMediaSession();
      this.syncNativeNotification();
      this.notify();
    } catch {
      this.state.isPlaying = false;
      this.notify();
    }
  }

  public pause() {
    this.userIntentPlay = false;

    const nativeMedia = typeof window !== 'undefined' ? (window as any).AndroidMediaNotification : null;
    if (nativeMedia && typeof nativeMedia.pauseAudio === 'function') {
      try { nativeMedia.pauseAudio(); } catch {}
    }

    if (this.audio) {
      try { this.audio.pause(); } catch {}
    }

    if (this.ytPlayer && this.isPlayerReady) {
      try {
        this.ytPlayer.pauseVideo();
      } catch {}
    }
    this.pendingPlay = false;
    this.state.isPlaying = false;
    this.syncMediaSession();
    this.syncNativeNotification();
    this.notify();
  }

  public togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public selectStation(station: RadioStation, autoPlay: boolean = true) {
    this.state.currentStation = station;
    this.state.currentTrack = stationToTrack(station);
    this.state.currentIndex = this.state.stations.findIndex(s => s.id === station.id);
    if (this.state.currentIndex === -1) this.state.currentIndex = 0;

    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_radio_current_station_id', station.id);
    }

    // Stop current audio and video players
    const nativeMedia = typeof window !== 'undefined' ? (window as any).AndroidMediaNotification : null;
    if (nativeMedia && typeof nativeMedia.stopAudio === 'function') {
      try { nativeMedia.stopAudio(); } catch {}
    }
    if (this.audio) {
      try { this.audio.pause(); } catch {}
    }
    if (this.ytPlayer && this.isPlayerReady) {
      try { this.ytPlayer.pauseVideo(); } catch {}
    }

    if (autoPlay) {
      this.play();
    } else {
      this.syncMediaSession();
      this.syncNativeNotification();
      this.notify();
    }
  }

  public nextStation() {
    if (this.state.stations.length === 0) return;
    const nextIdx = (this.state.currentIndex + 1) % this.state.stations.length;
    this.selectStation(this.state.stations[nextIdx], this.state.isPlaying);
  }

  public nextTrack() {
    this.nextStation();
  }

  public prevStation() {
    if (this.state.stations.length === 0) return;
    const prevIdx = (this.state.currentIndex - 1 + this.state.stations.length) % this.state.stations.length;
    this.selectStation(this.state.stations[prevIdx], this.state.isPlaying);
  }

  public prevTrack() {
    this.prevStation();
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    this.state.volume = clamped;

    const nativeMedia = typeof window !== 'undefined' ? (window as any).AndroidMediaNotification : null;
    if (nativeMedia && typeof nativeMedia.setVolume === 'function') {
      try { nativeMedia.setVolume(this.state.isMuted ? 0 : clamped / 100); } catch {}
    }

    if (this.audio) {
      this.audio.volume = clamped / 100;
      if (clamped === 0) {
        this.audio.muted = true;
      } else if (this.state.isMuted) {
        this.audio.muted = false;
      }
    }

    if (this.ytPlayer && this.isPlayerReady) {
      try {
        this.ytPlayer.setVolume(clamped);
        if (clamped === 0) {
          this.ytPlayer.mute();
          this.state.isMuted = true;
        } else if (this.state.isMuted) {
          this.ytPlayer.unMute();
          this.state.isMuted = false;
        }
      } catch {}
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_radio_volume', clamped.toString());
    }
    this.notify();
  }

  public toggleMute() {
    this.state.isMuted = !this.state.isMuted;

    const nativeMedia = typeof window !== 'undefined' ? (window as any).AndroidMediaNotification : null;
    if (nativeMedia && typeof nativeMedia.setVolume === 'function') {
      try { nativeMedia.setVolume(this.state.isMuted ? 0 : this.state.volume / 100); } catch {}
    }

    if (this.audio) {
      this.audio.muted = this.state.isMuted;
    }

    if (this.ytPlayer && this.isPlayerReady) {
      try {
        if (this.state.isMuted) {
          this.ytPlayer.mute();
        } else {
          this.ytPlayer.unMute();
        }
      } catch {}
    }
    this.notify();
  }

  public addCustomStation(urlOrId: string, name?: string): boolean {
    const trimmed = urlOrId.trim();
    const videoId = extractYouTubeId(trimmed);

    let station: RadioStation;
    const stationName = name?.trim() || `Custom Radio #${this.state.stations.length + 1}`;

    if (videoId) {
      station = {
        id: `custom-${Date.now()}`,
        name: stationName,
        subtitle: 'YouTube Live Stream',
        videoId,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        isLive: true,
        isCustom: true,
      };
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      station = {
        id: `custom-${Date.now()}`,
        name: stationName,
        subtitle: '24/7 Live Audio Stream',
        streamUrl: trimmed,
        thumbnailUrl: '/icon-192x192.png',
        isLive: true,
        isCustom: true,
      };
    } else {
      return false;
    }

    const updated = [...this.state.stations, station];
    this.state.stations = updated;
    this.state.playlist = updated.map(stationToTrack);

    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_radio_active_stations', JSON.stringify(updated));
    }

    this.selectStation(station, true);
    return true;
  }

  public deleteStation(id: string) {
    const updated = this.state.stations.filter(s => s.id !== id);
    const finalStations = updated.length > 0 ? updated : [...PRESET_STATIONS];
    this.state.stations = finalStations;
    this.state.playlist = finalStations.map(stationToTrack);

    if (this.state.currentStation.id === id) {
      this.selectStation(finalStations[0], this.state.isPlaying);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_radio_active_stations', JSON.stringify(finalStations));
    }
    this.notify();
  }

  public deleteCustomStation(id: string) {
    this.deleteStation(id);
  }

  public resetStationsToDefault() {
    this.state.stations = [...PRESET_STATIONS];
    this.state.playlist = PRESET_STATIONS.map(stationToTrack);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kairo_radio_active_stations');
      localStorage.removeItem('kairo_radio_custom_stations');
    }
    this.selectStation(PRESET_STATIONS[0], this.state.isPlaying);
    this.notify();
  }

  // Backwards compatibility methods
  public setPlaylist(_tracks: Track[]) {}
  public selectTrack(index: number) {
    if (this.state.stations[index]) {
      this.selectStation(this.state.stations[index], true);
    }
  }
  public seek(_time: number) {}
  public toggleShuffle() {
    this.state.isShuffle = !this.state.isShuffle;
    this.notify();
  }
  public toggleRepeat() {
    this.state.isRepeat = !this.state.isRepeat;
    this.notify();
  }
}

export const musicPlayer = new MusicPlayerService();
