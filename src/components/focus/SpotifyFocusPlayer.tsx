import React, { useState, useEffect, useRef } from 'react';
import { Music, Radio, Sparkles, ExternalLink, Play, Pause, Volume2, VolumeX, ListMusic, ChevronDown, ChevronUp, Maximize2, X, RefreshCw } from 'lucide-react';
import { playClickSound } from '../../lib/sound';

interface SpotifyFocusPlayerProps {
  initialPlaylistUrl?: string;
}

const DEFAULT_PLAYLIST_URL = 'https://open.spotify.com/playlist/3QstTBzmJbgH2NDHVI9pTL?si=adY1bwZDQlekNY5QmlM0eQ';

const FREE_RADIO_STREAMS = [
  {
    id: 'lofi',
    name: 'Lo-Fi Chill Beats',
    tag: 'Study & Relax',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    icon: '☕',
    accentBg: '#FFE873',
  },
  {
    id: 'anime',
    name: 'Anime Piano & Vibes',
    tag: 'Deep Focus',
    streamUrl: 'https://streaming.radionomy.com/AnimeNfoRadio',
    icon: '🌸',
    accentBg: '#E8DCFF',
  },
  {
    id: 'synthwave',
    name: 'Synthwave / Retro Flow',
    tag: 'Cyberpunk Focus',
    streamUrl: 'https://stream.nightride.fm/nightride.mp3',
    icon: '⚡',
    accentBg: '#BAE6FD',
  },
];

export const SpotifyFocusPlayer: React.FC<SpotifyFocusPlayerProps> = ({
  initialPlaylistUrl = DEFAULT_PLAYLIST_URL,
}) => {
  const [activeMode, setActiveMode] = useState<'spotify' | 'radio'>('spotify');
  const [playerSize, setPlayerSize] = useState<'full' | 'compact'>('full');
  const [isFullInAppPlayerOpen, setIsFullInAppPlayerOpen] = useState(false);
  const [webPlayerKey, setWebPlayerKey] = useState(0);

  const [playlistUrl, setPlaylistUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_spotify_playlist') || initialPlaylistUrl;
    }
    return initialPlaylistUrl;
  });

  const [inputUrl, setInputUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Free Radio Audio Player State
  const [activeRadio, setActiveRadio] = useState<string | null>(null);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Convert regular Spotify URL to Spotify Embed URL
  const getEmbedUrl = (rawUrl: string) => {
    try {
      const url = new URL(rawUrl.trim());
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const type = pathParts[0]; // playlist, track, album
        const id = pathParts[1];
        return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
      }
    } catch {
      // fallback
    }
    return `https://open.spotify.com/embed/playlist/3QstTBzmJbgH2NDHVI9pTL?utm_source=generator&theme=0`;
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    playClickSound();
    setPlaylistUrl(inputUrl.trim());
    localStorage.setItem('kairo_spotify_playlist', inputUrl.trim());
    setIsEditingUrl(false);
    setInputUrl('');
  };

  const handlePlayRadio = (stream: typeof FREE_RADIO_STREAMS[0]) => {
    playClickSound();
    if (activeRadio === stream.id && isRadioPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsRadioPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const newAudio = new Audio(stream.streamUrl);
    newAudio.volume = 0.6;
    newAudio.play().then(() => {
      setIsRadioPlaying(true);
      setActiveRadio(stream.id);
    }).catch(() => {
      setIsRadioPlaying(false);
    });

    audioRef.current = newAudio;
  };

  const handleStopRadio = () => {
    playClickSound();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsRadioPlaying(false);
    setActiveRadio(null);
  };

  return (
    <div className="neo-card p-4 bg-white space-y-3 font-body select-none">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              playClickSound();
              setActiveMode('spotify');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border-[1.5px] transition-all cursor-pointer ${
              activeMode === 'spotify'
                ? 'bg-[#1DB954] text-white border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                : 'bg-[#FAF7F2] text-slate-600 border-slate-200 hover:border-[#18181B]'
            }`}
          >
            <Music className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Spotify Hub</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setActiveMode('radio');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border-[1.5px] transition-all cursor-pointer ${
              activeMode === 'radio'
                ? 'bg-[#FFE873] text-[#18181B] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                : 'bg-[#FAF7F2] text-slate-600 border-slate-200 hover:border-[#18181B]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Free Lo-Fi Stream</span>
          </button>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Mode 1: Spotify Embed Player */}
      {isExpanded && activeMode === 'spotify' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
              Connected Playlist
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playClickSound();
                  setPlayerSize(playerSize === 'full' ? 'compact' : 'full');
                }}
                className="text-[11px] font-bold text-slate-600 hover:text-black cursor-pointer underline"
              >
                {playerSize === 'full' ? 'Компактный вид' : 'Полный список'}
              </button>

              <button
                onClick={() => setIsEditingUrl(!isEditingUrl)}
                className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
              >
                {isEditingUrl ? 'Cancel' : 'Change Link'}
              </button>
            </div>
          </div>

          {/* Full In-App Spotify Player Launcher */}
          <button
            onClick={() => {
              playClickSound();
              setIsFullInAppPlayerOpen(true);
            }}
            className="w-full p-2.5 bg-[#1DB954] hover:bg-[#1AA34A] text-white border-[1.75px] border-[#18181B] rounded-xl flex items-center justify-between shadow-[2px_2px_0px_#18181B] cursor-pointer active:translate-y-0.5 active:shadow-none transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🎧</span>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Открыть полный Spotify в приложении</p>
                <p className="text-[10px] text-white/90">Слушайте треки soka8imo целиком со всеми функциями</p>
              </div>
            </div>

            <Maximize2 className="w-4 h-4 text-white/80 shrink-0" />
          </button>

          {/* Change Playlist Input */}
          {isEditingUrl && (
            <form onSubmit={handleSaveCustomUrl} className="flex items-center gap-2 p-2 bg-[#FAF7F2] border border-slate-200 rounded-xl">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste Spotify playlist / track link..."
                className="flex-1 px-3 py-1.5 bg-white border border-[#18181B] rounded-lg text-xs font-medium outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#1DB954] text-white text-xs font-bold rounded-lg border border-[#18181B] shadow-xs cursor-pointer"
              >
                Apply
              </button>
            </form>
          )}

          {/* Spotify Official Iframe Widget */}
          <div className="w-full rounded-2xl overflow-hidden border-[1.75px] border-[#18181B] shadow-[2px_2px_0px_#18181B] bg-black">
            <iframe
              src={getEmbedUrl(playlistUrl)}
              width="100%"
              height={playerSize === 'full' ? '352' : '152'}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Player"
              className="w-full block"
            />
          </div>
        </div>
      )}

      {/* Mode 2: Free Lo-Fi / Anime Radio Streams (100% Free) */}
      {isExpanded && activeMode === 'radio' && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Instant 24/7 Flow Streams (No Login Required)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {FREE_RADIO_STREAMS.map((stream) => {
              const isCurrent = activeRadio === stream.id && isRadioPlaying;

              return (
                <button
                  key={stream.id}
                  onClick={() => handlePlayRadio(stream)}
                  className={`p-3 rounded-xl border-[1.5px] border-[#18181B] flex items-center justify-between text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#D1FBE4] shadow-[2px_2px_0px_#18181B] -translate-y-0.5'
                      : 'bg-[#FAF7F2] hover:bg-slate-100 shadow-[1px_1px_0px_#18181B]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">{stream.icon}</span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#18181B] truncate">{stream.name}</h4>
                      <span className="text-[9px] text-slate-500 font-medium block">{stream.tag}</span>
                    </div>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-lg border border-[#18181B] flex items-center justify-center shrink-0 ${
                      isCurrent ? 'bg-[#18181B] text-white' : 'bg-white text-[#18181B]'
                    }`}
                  >
                    {isCurrent ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-[#18181B]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {isRadioPlaying && (
            <div className="pt-1 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                Live Stream Playing...
              </span>
              <button
                onClick={handleStopRadio}
                className="text-[11px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
              >
                Stop Stream
              </button>
            </div>
          )}
        </div>
      )}

      {/* Full In-App Spotify Player Sheet */}
      {isFullInAppPlayerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-[calc(env(safe-area-inset-bottom,0px)+10px)] px-2 sm:px-4">
          <div className="w-full max-w-2xl mx-auto flex-1 bg-[#121212] rounded-3xl border-2 border-[#18181B] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Navigation Bar */}
            <div className="p-3 bg-[#18181B] text-white border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center text-white text-xs font-bold">
                  🎧
                </span>
                <div>
                  <h3 className="text-xs font-bold leading-tight">Spotify Web Player • Daily Sumire</h3>
                  <p className="text-[9px] text-slate-300">Полный плеер со всеми треками внутри планера</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWebPlayerKey((k) => k + 1)}
                  title="Reload Player"
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setIsFullInAppPlayerOpen(false);
                  }}
                  title="Close & Return to Focus"
                  className="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-App Spotify Web Player Frame */}
            <div className="flex-1 w-full bg-[#121212] relative">
              <iframe
                key={webPlayerKey}
                src={playlistUrl}
                title="Full Spotify Web Player"
                className="w-full h-full border-none"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
