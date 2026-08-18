import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, ListMusic, Music2, Plus, Sparkles, X, CloudDownload, Settings2, Check } from 'lucide-react';
import { SOKA8IMO_PLAYLIST, Track } from '../../data/playlist';
import { playClickSound } from '../../lib/sound';

export const InAppMusicPlayer: React.FC = () => {
  const [remoteUrl, setRemoteUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_music_remote_url') || '';
    }
    return '';
  });

  const [playlist, setPlaylist] = useState<Track[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_custom_tracks');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return SOKA8IMO_PLAYLIST;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isTracklistOpen, setIsTracklistOpen] = useState(false);
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [isRemoteSettingsOpen, setIsRemoteSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // New track form
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [inputRemoteUrl, setInputRemoteUrl] = useState(remoteUrl);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = playlist[currentIndex] || SOKA8IMO_PLAYLIST[0];

  // Auto-sync from remote Vercel repo on mount if configured
  useEffect(() => {
    if (remoteUrl) {
      syncFromRemote(remoteUrl);
    }
  }, []);

  const syncFromRemote = async (urlToFetch: string) => {
    if (!urlToFetch.trim()) return;
    setIsSyncing(true);
    setSyncStatus('Загрузка с Vercel...');
    try {
      const res = await fetch(urlToFetch.trim());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPlaylist(data);
          localStorage.setItem('kairo_custom_tracks', JSON.stringify(data));
          setSyncStatus(`Успешно! Синхронизировано ${data.length} треков`);
          setTimeout(() => setSyncStatus(null), 3000);
        } else {
          setSyncStatus('Файл пуст или имеет неверный формат');
        }
      } else {
        setSyncStatus(`Ошибка сети: ${res.status}`);
      }
    } catch (err) {
      setSyncStatus('Не удалось подключиться к Vercel URL');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveRemoteUrl = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    const clean = inputRemoteUrl.trim();
    setRemoteUrl(clean);
    localStorage.setItem('kairo_music_remote_url', clean);
    if (clean) {
      syncFromRemote(clean);
    }
    setIsRemoteSettingsOpen(false);
  };

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(currentTrack.audioUrl);
    audio.volume = volume;
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
        album: 'soka8imo • Daily Sumire',
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

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    playClickSound();

    const newTrackObj: Track = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      artist: newArtist.trim() || 'soka',
      duration: '03:30',
      coverUrl: '/icon-192x192.png',
      audioUrl: newUrl.trim(),
    };

    const updated = [...playlist, newTrackObj];
    setPlaylist(updated);
    localStorage.setItem('kairo_custom_tracks', JSON.stringify(updated));

    setNewTitle('');
    setNewArtist('');
    setNewUrl('');
    setIsAddTrackOpen(false);
  };

  const handleDeleteTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    if (playlist.length <= 1) return;
    const updated = playlist.filter((t) => t.id !== id);
    setPlaylist(updated);
    localStorage.setItem('kairo_custom_tracks', JSON.stringify(updated));
    if (currentIndex >= updated.length) {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="neo-card p-4 bg-white space-y-3.5 font-body select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#FFE873] border border-[#18181B] flex items-center justify-center text-xs shadow-xs">
            💿
          </span>
          <div>
            <h3 className="text-xs font-bold font-display text-[#18181B] leading-tight">soka8imo In-App Player</h3>
            <span className="text-[10px] text-slate-500 font-medium">Синхронизация с Vercel / Без лимитов</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              playClickSound();
              setIsRemoteSettingsOpen(!isRemoteSettingsOpen);
            }}
            title="Настройка Vercel CDN"
            className="w-7 h-7 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B] cursor-pointer"
          >
            <CloudDownload className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              playClickSound();
              setIsTracklistOpen(!isTracklistOpen);
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border-[1.5px] border-[#18181B] flex items-center gap-1 cursor-pointer transition-all ${
              isTracklistOpen ? 'bg-[#18181B] text-white' : 'bg-[#FAF7F2] text-[#18181B] hover:bg-slate-100 shadow-[1px_1px_0px_#18181B]'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Треки ({playlist.length})</span>
          </button>
        </div>
      </div>

      {/* Remote Vercel Config Modal/Drawer */}
      {isRemoteSettingsOpen && (
        <form onSubmit={handleSaveRemoteUrl} className="p-3 bg-[#E8DCFF] border-[1.75px] border-[#18181B] rounded-2xl space-y-2.5 shadow-[2px_2px_0px_#18181B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#18181B] flex items-center gap-1">
              <CloudDownload className="w-3.5 h-3.5" />
              Подключение к вашему Vercel репозиторию
            </span>
            <button type="button" onClick={() => setIsRemoteSettingsOpen(false)} className="text-slate-600 hover:text-black">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[10px] text-slate-700 leading-snug">
            Вставьте прямую ссылку на <code>tracks.json</code> с вашего Vercel проекта. Делая <code>git push</code> в репозиторий с треками, приложение само обновит плейлист!
          </p>

          <input
            type="url"
            value={inputRemoteUrl}
            onChange={(e) => setInputRemoteUrl(e.target.value)}
            placeholder="https://my-music-repo.vercel.app/tracks.json"
            className="w-full px-3 py-1.5 bg-white border border-[#18181B] rounded-lg text-xs outline-none font-mono"
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] font-bold text-purple-900">{syncStatus || (isSyncing ? 'Загрузка...' : '')}</span>

            <div className="flex gap-2">
              {remoteUrl && (
                <button
                  type="button"
                  onClick={() => syncFromRemote(remoteUrl)}
                  disabled={isSyncing}
                  className="px-3 py-1 bg-white hover:bg-slate-50 text-xs font-bold rounded-lg border border-[#18181B] shadow-xs cursor-pointer"
                >
                  {isSyncing ? 'Синхронизация...' : 'Обновить сейчас'}
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-1 bg-[#18181B] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Сохранить URL
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Playing Track Hero Card */}
      <div className="p-3.5 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3">
        <div className="flex items-center gap-3">
          {/* Animated Spinning Vinyl Cover */}
          <div className="relative w-14 h-14 rounded-2xl border-[1.75px] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] overflow-hidden shrink-0 bg-[#18181B]">
            <img
              src="/icon-192x192.png"
              alt="Track Cover"
              className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '6s' }}
            />
            <div className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-[#FFE873] border border-[#18181B]" />
          </div>

          {/* Title & Artist */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-[#18181B] truncate">{currentTrack.title}</h4>
              {isPlaying && (
                <span className="flex items-center gap-0.5 shrink-0">
                  <span className="w-1 h-3 bg-[#1DB954] rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-[#1DB954] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-2 bg-[#1DB954] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Progress Scrubber Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#18181B]"
          />
          <div className="flex items-center justify-between text-[10px] font-bold font-mono-num text-slate-500">
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between pt-1">
          {/* Shuffle */}
          <button
            onClick={() => {
              playClickSound();
              setIsShuffle(!isShuffle);
            }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              isShuffle ? 'bg-[#FFE873] border-[#18181B] text-[#18181B] shadow-xs' : 'border-transparent text-slate-400 hover:text-black'
            }`}
            title="Перемешать"
          >
            <Shuffle className="w-3.5 h-3.5 stroke-[2]" />
          </button>

          {/* Prev */}
          <button
            onClick={handlePrevTrack}
            className="w-10 h-10 rounded-xl bg-white border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B] active:translate-y-0.5 cursor-pointer"
            title="Предыдущий"
          >
            <SkipBack className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Big Play/Pause Button */}
          <button
            onClick={handleTogglePlay}
            className="w-14 h-12 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] border-[2px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-[#18181B]" /> : <Play className="w-6 h-6 fill-[#18181B] ml-0.5" />}
          </button>

          {/* Next */}
          <button
            onClick={handleNextTrack}
            className="w-10 h-10 rounded-xl bg-white border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B] active:translate-y-0.5 cursor-pointer"
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
            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              isRepeat ? 'bg-[#FFE873] border-[#18181B] text-[#18181B] shadow-xs' : 'border-transparent text-slate-400 hover:text-black'
            }`}
            title="Повтор"
          >
            <Repeat className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Tracklist Drawer */}
      {isTracklistOpen && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Список треков ({playlist.length})
            </span>

            <button
              onClick={() => {
                playClickSound();
                setIsAddTrackOpen(!isAddTrackOpen);
              }}
              className="text-xs font-bold text-[#18181B] hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить трек вручную</span>
            </button>
          </div>

          {/* Add Track Form */}
          {isAddTrackOpen && (
            <form onSubmit={handleAddTrack} className="p-3 bg-[#FAF7F2] border-[1.5px] border-[#18181B] rounded-xl space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Название трека (например: Grand Escape)"
                className="w-full px-3 py-1.5 bg-white border border-[#18181B] rounded-lg text-xs outline-none"
                required
              />
              <input
                type="text"
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                placeholder="Исполнитель (например: RADWIMPS)"
                className="w-full px-3 py-1.5 bg-white border border-[#18181B] rounded-lg text-xs outline-none"
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Прямая ссылка на аудио (MP3 / Vercel CDN url)"
                className="w-full px-3 py-1.5 bg-white border border-[#18181B] rounded-lg text-xs outline-none"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTrackOpen(false)}
                  className="px-3 py-1 text-xs text-slate-500 hover:text-black cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#FFE873] text-[#18181B] font-bold text-xs rounded-lg border border-[#18181B] shadow-xs cursor-pointer"
                >
                  Сохранить трек
                </button>
              </div>
            </form>
          )}

          {/* Tracks List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {playlist.map((track, idx) => {
              const isCurrent = idx === currentIndex;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    playClickSound();
                    setCurrentIndex(idx);
                    setIsPlaying(true);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-[#E8DCFF] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]'
                      : 'bg-[#FAF7F2] border-slate-200 hover:border-[#18181B]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold font-mono-num text-slate-400 w-4 text-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#18181B] truncate">{track.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold font-mono-num text-slate-500">{track.duration}</span>
                    <button
                      onClick={(e) => handleDeleteTrack(track.id, e)}
                      title="Удалить"
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
