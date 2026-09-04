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
    audioUrl: `https://www.youtube.com/watch?v=${station.videoId}`,
  };
}

class MusicPlayerService {
  private ytPlayer: any = null;
  private isPlayerReady: boolean = false;
  private pendingPlay: boolean = false;
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
        const customRaw = localStorage.getItem('kairo_radio_custom_stations');
        if (customRaw) {
          const parsed = JSON.parse(customRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialStations = [...PRESET_STATIONS, ...parsed];
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
      // Lazy init host and YouTube API on first idle or user interaction
      if (document.readyState === 'complete') {
        this.initYouTubeApi();
      } else {
        window.addEventListener('load', () => this.initYouTubeApi(), { once: true });
      }
    }
  }

  private getOrCreateHostContainer(): HTMLElement {
    if (this.hostElement && document.body.contains(this.hostElement)) {
      return this.hostElement;
    }

    let host = document.getElementById('sumire-lofi-radio-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sumire-lofi-radio-host';
      
      // Floating container header
      const header = document.createElement('div');
      header.id = 'sumire-lofi-host-header';
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.padding = '6px 12px';
      header.style.backgroundColor = '#FAF8F5';
      header.style.borderBottom = '1.75px solid #24201D';
      header.style.userSelect = 'none';

      const titleEl = document.createElement('span');
      titleEl.id = 'sumire-lofi-host-title';
      titleEl.style.fontSize = '11px';
      titleEl.style.fontWeight = '800';
      titleEl.style.color = '#24201D';
      titleEl.style.display = 'flex';
      titleEl.style.alignItems = 'center';
      titleEl.style.gap = '6px';
      titleEl.innerHTML = '<span style="width: 8px; height: 8px; border-radius: 50%; background-color: #E15A46; display: inline-block; animation: pulse 1.5s infinite;"></span> <span id="sumire-lofi-header-station-name">' + this.state.currentStation.name + '</span> • LIVE';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.innerText = '✕ Скрыть';
      closeBtn.style.background = '#F4F0EA';
      closeBtn.style.border = '1px solid #24201D';
      closeBtn.style.borderRadius = '6px';
      closeBtn.style.fontSize = '10px';
      closeBtn.style.fontWeight = '700';
      closeBtn.style.color = '#24201D';
      closeBtn.style.padding = '2px 8px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        this.setVideoVisible(false);
      };

      header.appendChild(titleEl);
      header.appendChild(closeBtn);
      host.appendChild(header);

      // Player frame placeholder
      const playerDiv = document.createElement('div');
      playerDiv.id = 'sumire-yt-player-target';
      playerDiv.style.width = '100%';
      playerDiv.style.height = 'calc(100% - 30px)';
      playerDiv.style.backgroundColor = '#000';
      host.appendChild(playerDiv);

      document.body.appendChild(host);
    }

    this.hostElement = host;
    this.applyVideoVisibilityStyles(host, this.state.isVideoVisible);
    return host;
  }

  private applyVideoVisibilityStyles(host: HTMLElement, isVisible: boolean) {
    if (!host) return;

    if (isVisible) {
      host.style.position = 'fixed';
      host.style.bottom = '86px';
      host.style.right = '16px';
      host.style.width = 'min(360px, calc(100vw - 32px))';
      host.style.height = '232px';
      host.style.opacity = '1';
      host.style.pointerEvents = 'auto';
      host.style.borderRadius = '16px';
      host.style.border = '2px solid #24201D';
      host.style.boxShadow = '3px 3px 0px #24201D';
      host.style.overflow = 'hidden';
      host.style.zIndex = '9990';
      host.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      host.style.transform = 'translateY(0)';
    } else {
      host.style.position = 'fixed';
      host.style.bottom = '-9999px';
      host.style.left = '-9999px';
      host.style.width = '240px';
      host.style.height = '140px';
      host.style.opacity = '0.001';
      host.style.pointerEvents = 'none';
      host.style.boxShadow = 'none';
      host.style.border = 'none';
      host.style.zIndex = '-999';
      host.style.transform = 'translateY(20px)';
    }

    const titleEl = document.getElementById('sumire-lofi-header-station-name');
    if (titleEl) {
      titleEl.innerText = this.state.currentStation.name;
    }
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
      this.ytPlayer = new (window as any).YT.Player('sumire-yt-player-target', {
        height: '100%',
        width: '100%',
        videoId: this.state.currentStation.videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
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
              this.state.isPlaying = false;
              this.state.isBuffering = false;
              this.syncMediaSession();
              this.syncNativeNotification();
              this.notify();
            } else if (event.data === YT.PlayerState.BUFFERING) {
              this.state.isBuffering = true;
              this.notify();
            } else if (event.data === YT.PlayerState.ENDED) {
              // Live streams typically don't end, but if it ends, reconnect to current station
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

    if (this.hostElement) {
      const titleEl = document.getElementById('sumire-lofi-header-station-name');
      if (titleEl) {
        titleEl.innerText = station.name;
      }
    }

    if (this.ytPlayer && this.isPlayerReady) {
      try {
        if (autoPlay) {
          this.ytPlayer.loadVideoById(station.videoId);
          this.state.isPlaying = true;
        } else {
          this.ytPlayer.cueVideoById(station.videoId);
        }
      } catch {}
    } else if (autoPlay) {
      this.pendingPlay = true;
      this.initYouTubeApi();
    }

    this.syncMediaSession();
    this.syncNativeNotification();
    this.notify();
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
    if (this.ytPlayer && this.isPlayerReady) {
      try {
        if (this.state.isMuted) {
          this.ytPlayer.unMute();
          this.state.isMuted = false;
        } else {
          this.ytPlayer.mute();
          this.state.isMuted = true;
        }
      } catch {}
    } else {
      this.state.isMuted = !this.state.isMuted;
    }
    this.notify();
  }

  public setVideoVisible(visible: boolean) {
    this.state.isVideoVisible = visible;
    if (this.hostElement) {
      this.applyVideoVisibilityStyles(this.hostElement, visible);
    } else {
      this.getOrCreateHostContainer();
    }
    this.notify();
  }

  public toggleVideo() {
    this.setVideoVisible(!this.state.isVideoVisible);
  }

  public addCustomStation(urlOrId: string, name?: string): boolean {
    const videoId = extractYouTubeId(urlOrId);
    if (!videoId) return false;

    const stationName = name?.trim() || 'Custom Radio Stream';
    const station: RadioStation = {
      id: `custom-${Date.now()}`,
      name: stationName,
      subtitle: 'YouTube Live Stream',
      videoId,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      isLive: true,
      isCustom: true,
    };

    const updated = [...this.state.stations, station];
    this.state.stations = updated;
    this.state.playlist = updated.map(stationToTrack);

    if (typeof window !== 'undefined') {
      const customOnly = updated.filter(s => s.isCustom);
      localStorage.setItem('kairo_radio_custom_stations', JSON.stringify(customOnly));
    }

    this.selectStation(station, true);
    return true;
  }

  public deleteCustomStation(id: string) {
    const updated = this.state.stations.filter(s => s.id !== id);
    this.state.stations = updated;
    this.state.playlist = updated.map(stationToTrack);

    if (this.state.currentStation.id === id) {
      this.selectStation(updated[0] || PRESET_STATIONS[0], this.state.isPlaying);
    }

    if (typeof window !== 'undefined') {
      const customOnly = updated.filter(s => s.isCustom);
      localStorage.setItem('kairo_radio_custom_stations', JSON.stringify(customOnly));
    }
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
