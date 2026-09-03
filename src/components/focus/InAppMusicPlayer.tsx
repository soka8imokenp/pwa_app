import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  ListMusic,
  RefreshCw,
  Search,
  Music,
} from 'lucide-react';
import { Track } from '../../data/playlist';
import { playClickSound } from '../../lib/sound';
import { musicPlayer, MusicPlayerState } from '../../lib/musicPlayerService';

const VERCEL_API_URL = 'https://sumiredaily-music.vercel.app/tracks.json';
const VERCEL_BASE_ORIGIN = 'https://sumiredaily-music.vercel.app';

export const InAppMusicPlayer: React.FC = () => {
  const [playerState, setPlayerState] = useState<MusicPlayerState>(() => musicPlayer.getState());
  const [isTracklistOpen, setIsTracklistOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Subscribe to persistent player service
  useEffect(() => {
    const unsubscribe = musicPlayer.subscribe((state) => {
      setPlayerState(state);
    });
    return unsubscribe;
  }, []);

  const { playlist, currentIndex, currentTrack, isPlaying, currentTime, duration, isShuffle, isRepeat } = playerState;

  // Helper to resolve full audio URL from Vercel
  const resolveAudioUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${VERCEL_BASE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Sync with Vercel API (only on mount or manual button click)
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
            coverUrl: t.coverUrl?.startsWith('http') ? t.coverUrl : `${VERCEL_BASE_ORIGIN}${t.coverUrl || '/icon-192x192.png'}`,
            audioUrl: resolveAudioUrl(t.audioUrl),
          }));

          musicPlayer.setPlaylist(formattedTracks);
          if (isManual) {
            setSyncStatus('Updated!');
            setTimeout(() => setSyncStatus(null), 3000);
          }
        } else if (isManual) {
          setSyncStatus('No .mp3 files on Vercel yet');
          setTimeout(() => setSyncStatus(null), 3000);
        }
      }
    } catch {
      if (isManual) {
        setSyncStatus('Connecting to Vercel...');
        setTimeout(() => setSyncStatus(null), 3000);
      }
    } finally {
      if (isManual) {
        setIsSyncing(false);
      }
    }
  };

  // Initial fetch on mount only (no periodic interval to avoid stream interruptions)
  useEffect(() => {
    fetchVercelTracks(false);
  }, []);

  const handleTogglePlay = () => {
    playClickSound();
    musicPlayer.togglePlay();
  };

  const handleNextTrack = () => {
    playClickSound();
    musicPlayer.nextTrack();
  };

  const handlePrevTrack = () => {
    playClickSound();
    musicPlayer.prevTrack();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    musicPlayer.seek(time);
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

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 font-body select-none">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F0BB58] border-[1.75px] border-[#24201D] flex items-center justify-center text-sm shadow-2xs shrink-0">
            <Music className="w-4 h-4 text-[#24201D] stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-display text-[#24201D] leading-tight">Focus Music</h3>
            {syncStatus && (
              <span className="text-[10px] text-[#3D6B52] font-bold block">{syncStatus}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Refresh / Check Vercel */}
          <button
            onClick={() => fetchVercelTracks(true)}
            disabled={isSyncing}
            title="Refresh from Vercel"
            className="w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs cursor-pointer active:translate-y-0.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#3D6B52]' : ''}`} />
          </button>

          {/* Tracklist Drawer Toggle */}
          <button
            onClick={() => {
              playClickSound();
              setIsTracklistOpen(!isTracklistOpen);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-[1.5px] border-[#24201D] flex items-center gap-1.5 cursor-pointer transition-all ${
              isTracklistOpen
                ? 'bg-[#24201D] text-[#FAF8F5]'
                : 'bg-[#FAF8F5] text-[#24201D] hover:bg-stone-100 shadow-2xs'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Tracks</span>
          </button>
        </div>
      </div>

      {/* Main Playing Track Card */}
      <div className="p-3.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        {currentTrack ? (
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm sm:text-base font-bold text-[#24201D] truncate">{currentTrack.title}</h4>
              {isPlaying && (
                <span className="flex items-center gap-0.5 shrink-0">
                  <span className="w-1 h-3 bg-[#24201D] rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-[#24201D] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-2 bg-[#24201D] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B635B] font-medium truncate mt-0.5">{currentTrack.artist}</p>
          </div>
        ) : (
          <div className="py-2 text-center">
            <p className="text-xs font-bold text-[#6B635B]">No tracks loaded yet</p>
            <p className="text-[10px] text-stone-400 mt-0.5 flex items-center justify-center gap-1">
              <span>Push .mp3 files to Vercel and tap</span>
              <RefreshCw className="w-3 h-3 text-stone-500 inline stroke-[2.25]" />
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
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#3D6B52]"
            style={{
              background: `linear-gradient(to right, #3D6B52 ${progressPercent}%, #E4E4E7 ${progressPercent}%)`,
            }}
          />
          <div className="flex items-center justify-between text-[10px] font-bold font-mono-num text-[#6B635B]">
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
              musicPlayer.toggleShuffle();
            }}
            disabled={!currentTrack}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              isShuffle ? 'bg-[#F0BB58] border-[#24201D] text-[#24201D] shadow-2xs' : 'border-transparent text-stone-400 hover:text-stone-800'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Prev */}
          <button
            onClick={handlePrevTrack}
            disabled={!currentTrack}
            className="w-11 h-11 rounded-xl bg-white border-[1.75px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer disabled:opacity-50"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Big Play/Pause Button */}
          <button
            onClick={handleTogglePlay}
            disabled={!currentTrack}
            className="w-16 h-12 rounded-2xl bg-[#3D6B52] hover:bg-[#345B45] border-[2px] border-[#24201D] flex items-center justify-center text-white shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
          </button>

          {/* Next */}
          <button
            onClick={handleNextTrack}
            disabled={!currentTrack}
            className="w-11 h-11 rounded-xl bg-white border-[1.75px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer disabled:opacity-50"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Repeat */}
          <button
            onClick={() => {
              playClickSound();
              musicPlayer.toggleRepeat();
            }}
            disabled={!currentTrack}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              isRepeat ? 'bg-[#F0BB58] border-[#24201D] text-[#24201D] shadow-2xs' : 'border-transparent text-stone-400 hover:text-stone-800'
            }`}
            title="Repeat Track"
          >
            <Repeat className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Tracklist Drawer */}
      {isTracklistOpen && (
        <div className="p-3 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks or artists..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#24201D] rounded-xl text-xs outline-none font-medium text-[#24201D]"
            />
          </div>

          {/* Tracks List */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 py-0.5">
            {filteredPlaylist.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4 flex items-center justify-center gap-1">
                <span>No tracks found. Upload .mp3 to Vercel and tap</span>
                <RefreshCw className="w-3 h-3 text-stone-400 inline" />
              </p>
            ) : (
              filteredPlaylist.map((track) => {
                const originalIndex = playlist.findIndex((t) => t.id === track.id);
                const isCurrent = originalIndex === currentIndex;

                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      playClickSound();
                      musicPlayer.selectTrack(originalIndex);
                    }}
                    className={`p-2.5 rounded-xl border-[1.5px] border-[#24201D] flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-[#DDE8DE] shadow-[2px_2px_0px_#24201D] -translate-y-0.5'
                        : 'bg-white hover:bg-stone-50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg border border-[#24201D] flex items-center justify-center text-xs font-bold font-mono-num shrink-0 ${
                          isCurrent ? 'bg-[#F0BB58] text-[#24201D]' : 'bg-[#FAF8F5] text-[#6B635B]'
                        }`}
                      >
                        {isCurrent && isPlaying ? (
                          <Play className="w-3 h-3 fill-[#24201D] stroke-[#24201D]" />
                        ) : (
                          originalIndex + 1
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#24201D]' : 'text-stone-800'}`}>
                          {track.title}
                        </p>
                        <p className="text-[10px] text-[#6B635B] truncate">{track.artist}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold font-mono-num text-[#6B635B] shrink-0">
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
