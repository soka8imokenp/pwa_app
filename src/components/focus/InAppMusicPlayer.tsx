import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  ListMusic,
  RefreshCw,
  Sliders,
  Search,
} from 'lucide-react';
import { Track } from '../../data/playlist';
import { playClickSound } from '../../lib/sound';

const VERCEL_API_URL = 'https://sumiredaily-music.vercel.app/tracks.json';
const VERCEL_BASE_ORIGIN = 'https://sumiredaily-music.vercel.app';

export const InAppMusicPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<Track[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_custom_tracks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
    }
    return [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Focus Soundscapes Ambient Layer (Mixer)
  const [ambientType, setAmbientType] = useState<'none' | 'rain' | 'waves' | 'forest' | 'whitenoise'>('none');
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  // UI state
  const [isTracklistOpen, setIsTracklistOpen] = useState(false);
  const [isMixerOpen, setIsMixerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = playlist[currentIndex] || null;

  // Helper to resolve full audio URL from Vercel
  const resolveAudioUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${VERCEL_BASE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Sync with Vercel API
  const fetchVercelTracks = async (isManual = false) => {
    if (isManual) {
      playClickSound();
      setIsSyncing(true);
    }
    try {
      const res = await fetch(`${VERCEL_API_URL}?t=${Date.now()}`);
      if (res.ok) {
        const rawTracks = await res.json();
        if (Array.isArray(rawTracks) && rawTracks.length > 0) {
          const formattedTracks: Track[] = rawTracks.map((t, idx) => ({
            id: t.id || (idx + 1).toString(),
            title: t.title || 'Unknown Track',
            artist: t.artist || 'Daily Sumire',
            duration: t.duration || '03:30',
            coverUrl: t.coverUrl?.startsWith('http') ? t.coverUrl : `${VERCEL_BASE_ORIGIN}${t.coverUrl || '/icon.png'}`,
            audioUrl: resolveAudioUrl(t.audioUrl),
          }));

          setPlaylist(formattedTracks);
          localStorage.setItem('kairo_custom_tracks', JSON.stringify(formattedTracks));
          if (isManual) {
            setSyncStatus('Треки обновлены!');
            setTimeout(() => setSyncStatus(null), 3000);
          }
        } else if (isManual) {
          setSyncStatus('В репозитории Vercel пока нет файлов .mp3');
          setTimeout(() => setSyncStatus(null), 3000);
        }
      }
    } catch {
      if (isManual) {
        setSyncStatus('Связь с Vercel...');
        setTimeout(() => setSyncStatus(null), 3000);
      }
    } finally {
      if (isManual) {
        setIsSyncing(false);
      }
    }
  };

  // Initial fetch and auto-polling every 45s
  useEffect(() => {
    fetchVercelTracks(false);
    const interval = setInterval(() => {
      fetchVercelTracks(false);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Ambient sound layer
  useEffect(() => {
    const AMBIENT_SOUND_URLS: Record<string, string> = {
      rain: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_730628a8d1.mp3?filename=soft-rain-ambient-111154.mp3',
      waves: 'https://cdn.pixabay.com/download/audio/2022/04/27/audio_34f664a781.mp3?filename=ocean-waves-ambient-110397.mp3',
      forest: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=in-the-forest-ambient-acoustic-guitar-12179.mp3',
      whitenoise: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3?filename=chill-abstract-intention-12099.mp3',
    };

    if (ambientType === 'none') {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current = null;
      }
      return;
    }

    const soundUrl = AMBIENT_SOUND_URLS[ambientType];
    if (soundUrl) {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
      const amb = new Audio(soundUrl);
      amb.loop = true;
      amb.volume = 0.5;
      amb.play().catch(() => {});
      ambientAudioRef.current = amb;
    }

    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
    };
  }, [ambientType]);

  // Main Audio setup
  useEffect(() => {
    if (!currentTrack) return;

    const fullAudioSrc = resolveAudioUrl(currentTrack.audioUrl);
    const audio = new Audio(fullAudioSrc);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      handleNextTrack();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // MediaSession lock screen integration
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'Daily Sumire',
        artwork: [
          { src: currentTrack.coverUrl || '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audio.play();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audio.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack());
    }

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  const handleTogglePlay = () => {
    playClickSound();
    if (!audioRef.current && currentTrack) {
      const audio = new Audio(resolveAudioUrl(currentTrack.audioUrl));
      audioRef.current = audio;
    }
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleNextTrack = () => {
    playClickSound();
    if (playlist.length === 0) return;

    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * playlist.length);
      setCurrentIndex(nextIdx);
    } else {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    playClickSound();
    if (playlist.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredPlaylist = playlist.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="neo-card p-4 bg-white space-y-3 font-body select-none">
      {/* Header Info & Sync Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center text-sm shadow-[1.5px_1.5px_0px_#18181B] shrink-0 font-bold">
            🎵
          </div>
          <div>
            <h3 className="text-xs font-bold font-display text-[#18181B] leading-tight">Daily Sumire Music</h3>
            <span className="text-[10px] text-slate-500 font-medium">
              {syncStatus || 'Vercel Cloud Sync'}
            </span>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5">
          {/* Refresh / Check Vercel for new songs */}
          <button
            onClick={() => fetchVercelTracks(true)}
            disabled={isSyncing}
            title="Проверить новые треки на Vercel"
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B] cursor-pointer active:translate-y-0.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          {/* Soundscapes Mixer Toggle */}
          <button
            onClick={() => {
              playClickSound();
              setIsMixerOpen(!isMixerOpen);
            }}
            title="Микшер звуков фона"
            className={`w-8 h-8 rounded-xl border-[1.5px] border-[#18181B] flex items-center justify-center cursor-pointer transition-all ${
              ambientType !== 'none' || isMixerOpen
                ? 'bg-[#E8DCFF] text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]'
                : 'bg-[#FAF7F2] text-slate-600 hover:bg-slate-100 shadow-[1px_1px_0px_#18181B]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Tracklist Drawer Toggle */}
          <button
            onClick={() => {
              playClickSound();
              setIsTracklistOpen(!isTracklistOpen);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-[1.5px] border-[#18181B] flex items-center gap-1.5 cursor-pointer transition-all ${
              isTracklistOpen
                ? 'bg-[#18181B] text-white'
                : 'bg-[#FAF7F2] text-[#18181B] hover:bg-slate-100 shadow-[1px_1px_0px_#18181B]'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Треки</span>
          </button>
        </div>
      </div>

      {/* Main Playing Track Card (Clean title, artist, timeline & controls) */}
      <div className="p-3.5 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3">
        {currentTrack ? (
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm sm:text-base font-bold text-[#18181B] truncate">{currentTrack.title}</h4>
              {isPlaying && (
                <span className="flex items-center gap-0.5 shrink-0">
                  <span className="w-1 h-3 bg-[#1DB954] rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-[#1DB954] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-2 bg-[#1DB954] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{currentTrack.artist}</p>
          </div>
        ) : (
          <div className="py-2 text-center">
            <p className="text-xs font-bold text-slate-600">Библиотека пуста</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Загрузите .mp3 в ваш Vercel репозиторий и нажмите 🔄
            </p>
          </div>
        )}

        {/* Progress Scrubber Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={!currentTrack}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#18181B]"
          />
          <div className="flex items-center justify-between text-[10px] font-bold font-mono-num text-slate-500">
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Shuffle */}
          <button
            onClick={() => {
              playClickSound();
              setIsShuffle(!isShuffle);
            }}
            disabled={!currentTrack}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              isShuffle ? 'bg-[#FFE873] border-[#18181B] text-[#18181B] shadow-[1px_1px_0px_#18181B]' : 'border-transparent text-slate-400 hover:text-black'
            }`}
            title="Перемешать треки"
          >
            <Shuffle className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Prev */}
          <button
            onClick={handlePrevTrack}
            disabled={!currentTrack}
            className="w-11 h-11 rounded-xl bg-white border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
            title="Предыдущий"
          >
            <SkipBack className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Big Play/Pause Button */}
          <button
            onClick={handleTogglePlay}
            disabled={!currentTrack}
            className="w-16 h-12 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] border-[2px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-[#18181B]" /> : <Play className="w-6 h-6 fill-[#18181B] ml-0.5" />}
          </button>

          {/* Next */}
          <button
            onClick={handleNextTrack}
            disabled={!currentTrack}
            className="w-11 h-11 rounded-xl bg-white border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
            title="Следующий"
          >
            <SkipForward className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Repeat */}
          <button
            onClick={() => {
              playClickSound();
              setIsRepeat(!isRepeat);
            }}
            disabled={!currentTrack}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              isRepeat ? 'bg-[#FFE873] border-[#18181B] text-[#18181B] shadow-[1px_1px_0px_#18181B]' : 'border-transparent text-slate-400 hover:text-black'
            }`}
            title="Повтор трека"
          >
            <Repeat className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Focus Soundscapes Ambient Mixer Drawer (Clean buttons without volume bar) */}
      {isMixerOpen && (
        <div className="p-3 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl space-y-2 shadow-[2px_2px_0px_#18181B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#18181B] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Микшер звуков фона
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {ambientType !== 'none' ? `Активен: ${ambientType}` : 'Выключен'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[
              { id: 'none', label: 'Выкл', icon: '⛔' },
              { id: 'rain', label: 'Дождь', icon: '🌧️' },
              { id: 'waves', label: 'Волны', icon: '🌊' },
              { id: 'forest', label: 'Лес', icon: '🌲' },
              { id: 'whitenoise', label: 'Фокус', icon: '💨' },
            ].map((amb) => {
              const isSelected = ambientType === amb.id;
              return (
                <button
                  key={amb.id}
                  onClick={() => {
                    playClickSound();
                    setAmbientType(amb.id as any);
                  }}
                  className={`py-2 px-1 rounded-xl border-[1.5px] border-[#18181B] flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFE873] shadow-[1.5px_1.5px_0px_#18181B] -translate-y-0.5'
                      : 'bg-white hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">{amb.icon}</span>
                  <span className="text-[#18181B]">{amb.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracklist Drawer (Clean list with search) */}
      {isTracklistOpen && (
        <div className="space-y-2 pt-1">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или исполнителю..."
              className="w-full pl-8 pr-3 py-2 bg-[#FAF7F2] border border-[#18181B] rounded-xl text-xs outline-none font-medium"
            />
          </div>

          {/* Tracks List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {filteredPlaylist.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Треков пока нет. Загрузите .mp3 в ваш Vercel и нажмите 🔄
              </p>
            ) : (
              filteredPlaylist.map((track, idx) => {
                const originalIndex = playlist.findIndex((t) => t.id === track.id);
                const isCurrent = originalIndex === currentIndex;

                return (
                  <div
                    key={track.id || idx}
                    onClick={() => {
                      playClickSound();
                      setCurrentIndex(originalIndex);
                      setIsPlaying(true);
                    }}
                    className={`p-2.5 rounded-xl border-[1.5px] border-[#18181B] flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-[#E8DCFF] shadow-[2px_2px_0px_#18181B] -translate-y-0.5'
                        : 'bg-[#FAF7F2] hover:bg-slate-100 shadow-[1px_1px_0px_#18181B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg border border-[#18181B] flex items-center justify-center text-xs font-bold font-mono-num shrink-0 ${
                          isCurrent ? 'bg-[#FFE873] text-[#18181B]' : 'bg-white text-slate-500'
                        }`}
                      >
                        {isCurrent && isPlaying ? '▶' : originalIndex + 1}
                      </div>

                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#18181B]' : 'text-slate-800'}`}>
                          {track.title}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold font-mono-num text-slate-500 shrink-0">
                      {track.duration}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
