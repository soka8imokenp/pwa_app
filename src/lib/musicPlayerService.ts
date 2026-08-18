import { Track } from '../data/playlist';

export interface MusicPlayerState {
  playlist: Track[];
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  isRepeat: boolean;
}

type Listener = (state: MusicPlayerState) => void;

class MusicPlayerService {
  private audio: HTMLAudioElement | null = null;
  private listeners: Set<Listener> = new Set();
  private state: MusicPlayerState = {
    playlist: [],
    currentIndex: 0,
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isShuffle: false,
    isRepeat: false,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      // Expose global methods for native Android BroadcastReceiver
      (window as any).__sumireTogglePlay = () => this.togglePlay();
      (window as any).__sumireNextTrack = () => this.nextTrack();
      (window as any).__sumirePrevTrack = () => this.prevTrack();

      const saved = localStorage.getItem('kairo_custom_tracks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.state.playlist = parsed;
            this.state.currentTrack = parsed[0] || null;
          }
        } catch {
          // fallback
        }
      }
    }
  }

  private initAudio() {
    if (this.audio) return this.audio;
    const audio = new Audio();
    this.audio = audio;

    audio.addEventListener('timeupdate', () => {
      this.state.currentTime = audio.currentTime;
      this.state.duration = audio.duration || 0;
      this.updatePositionState();
      this.notify();
    });

    audio.addEventListener('ended', () => {
      this.nextTrack();
    });

    audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      this.syncNativeNotification();
      this.notify();
    });

    audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      this.syncNativeNotification();
      this.notify();
    });

    return audio;
  }

  private syncNativeNotification() {
    if (typeof window !== 'undefined') {
      const nativeNotification = (window as any).AndroidMediaNotification;
      if (nativeNotification && this.state.currentTrack) {
        try {
          nativeNotification.updateMedia(
            this.state.currentTrack.title || 'Daily Sumire',
            this.state.currentTrack.artist || 'Sumire Music',
            this.state.isPlaying
          );
        } catch {
          // ignore
        }
      }
    }
  }

  private updateMediaSession(track: Track) {
    this.syncNativeNotification();

    if ('mediaSession' in navigator) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const cover = track.coverUrl?.startsWith('http')
        ? track.coverUrl
        : `${origin}${track.coverUrl?.startsWith('/') ? '' : '/'}${track.coverUrl || 'icon-192x192.png'}`;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Daily Sumire',
        artwork: [
          { src: cover, sizes: '192x192', type: 'image/png' },
          { src: `${origin}/icon-512x512.png`, sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = this.state.isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());

      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime != null) {
            this.seek(details.seekTime);
          }
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          this.seek(Math.min(this.state.duration, this.state.currentTime + (details.seekOffset || 10)));
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          this.seek(Math.max(0, this.state.currentTime - (details.seekOffset || 10)));
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.state.isPlaying = false;
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'none';
            }
            if ((window as any).AndroidMediaNotification) {
              (window as any).AndroidMediaNotification.clearMedia();
            }
            this.notify();
          }
        });
      } catch {
        // action handlers not supported on some older engines
      }
    }
  }

  private updatePositionState() {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      if (this.state.duration > 0 && !isNaN(this.state.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(0, this.state.duration),
            playbackRate: 1,
            position: Math.min(this.state.duration, Math.max(0, this.state.currentTime)),
          });
        } catch {
          // ignore position error
        }
      }
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  public getState(): MusicPlayerState {
    return { ...this.state };
  }

  public setPlaylist(newTracks: Track[]) {
    // Only update if playlist actually changed
    const currentJson = JSON.stringify(this.state.playlist.map(t => t.id || t.audioUrl));
    const newJson = JSON.stringify(newTracks.map(t => t.id || t.audioUrl));
    if (currentJson === newJson && this.state.playlist.length === newTracks.length) {
      return;
    }

    this.state.playlist = newTracks;
    if (!this.state.currentTrack && newTracks.length > 0) {
      this.state.currentTrack = newTracks[0];
      this.state.currentIndex = 0;
    }
    localStorage.setItem('kairo_custom_tracks', JSON.stringify(newTracks));
    this.notify();
  }

  public selectTrack(index: number) {
    if (!this.state.playlist[index]) return;
    const track = this.state.playlist[index];
    this.state.currentIndex = index;
    this.state.currentTrack = track;

    const audio = this.initAudio();
    const currentSrc = audio.src;

    if (currentSrc !== track.audioUrl) {
      audio.src = track.audioUrl;
      audio.load();
    }

    audio.play().then(() => {
      this.state.isPlaying = true;
      this.updateMediaSession(track);
      this.notify();
    }).catch(() => {
      this.state.isPlaying = false;
      this.notify();
    });
  }

  public togglePlay() {
    if (!this.state.currentTrack && this.state.playlist.length > 0) {
      this.selectTrack(0);
      return;
    }
    if (!this.state.currentTrack) return;

    const audio = this.initAudio();
    if (!audio.src || audio.src === '' || audio.src !== this.state.currentTrack.audioUrl) {
      audio.src = this.state.currentTrack.audioUrl;
      audio.load();
    }

    if (this.state.isPlaying) {
      audio.pause();
      this.state.isPlaying = false;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      this.syncNativeNotification();
      this.notify();
    } else {
      audio.play().then(() => {
        this.state.isPlaying = true;
        if (this.state.currentTrack) {
          this.updateMediaSession(this.state.currentTrack);
        }
        this.notify();
      }).catch(() => {
        this.state.isPlaying = false;
        this.notify();
      });
    }
  }

  public nextTrack() {
    if (this.state.playlist.length === 0) return;

    if (this.state.isRepeat && this.audio) {
      this.audio.currentTime = 0;
      this.audio.play();
      this.state.isPlaying = true;
      this.syncNativeNotification();
      this.notify();
      return;
    }

    let nextIdx = (this.state.currentIndex + 1) % this.state.playlist.length;
    if (this.state.isShuffle && this.state.playlist.length > 1) {
      nextIdx = Math.floor(Math.random() * this.state.playlist.length);
    }
    this.selectTrack(nextIdx);
  }

  public prevTrack() {
    if (this.state.playlist.length === 0) return;
    if (this.audio && this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    const prevIdx = (this.state.currentIndex - 1 + this.state.playlist.length) % this.state.playlist.length;
    this.selectTrack(prevIdx);
  }

  public seek(time: number) {
    if (this.audio) {
      this.audio.currentTime = time;
      this.state.currentTime = time;
      this.updatePositionState();
      this.notify();
    }
  }

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
