import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Radio,
  Tv,
  ListMusic,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import { musicPlayer, MusicPlayerState, extractYouTubeId } from '../../lib/musicPlayerService';
import { RadioStation } from '../../types/radio';

export const InAppMusicPlayer: React.FC = () => {
  const [playerState, setPlayerState] = useState<MusicPlayerState>(() => musicPlayer.getState());
  const [isStationsOpen, setIsStationsOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [isAddingStation, setIsAddingStation] = useState(false);

  // Subscribe to persistent player service
  useEffect(() => {
    const unsubscribe = musicPlayer.subscribe((state) => {
      setPlayerState(state);
    });
    return unsubscribe;
  }, []);

  const {
    stations,
    currentStation,
    isPlaying,
    isBuffering,
    volume,
    isMuted,
    isVideoVisible,
  } = playerState;

  const handleTogglePlay = () => {
    playClickSound();
    musicPlayer.togglePlay();
  };

  const handleNextStation = () => {
    playClickSound();
    musicPlayer.nextStation();
  };

  const handlePrevStation = () => {
    playClickSound();
    musicPlayer.prevStation();
  };

  const handleToggleMute = () => {
    playClickSound();
    musicPlayer.toggleMute();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    musicPlayer.setVolume(val);
  };

  const handleToggleVideo = () => {
    playClickSound();
    musicPlayer.toggleVideo();
  };

  const handleSelectStation = (station: RadioStation) => {
    playClickSound();
    musicPlayer.selectStation(station, true);
  };

  const handleAddCustomStation = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setCustomError(null);

    if (!customUrl.trim()) {
      setCustomError('Вставьте ссылку на YouTube или ID видео');
      return;
    }

    const videoId = extractYouTubeId(customUrl);
    if (!videoId) {
      setCustomError('Некорректная ссылка на YouTube стрим');
      return;
    }

    const success = musicPlayer.addCustomStation(customUrl, customName);
    if (success) {
      setCustomUrl('');
      setCustomName('');
      setIsAddingStation(false);
    } else {
      setCustomError('Не удалось добавить станцию');
    }
  };

  const handleDeleteStation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    playClickSound();
    musicPlayer.deleteCustomStation(id);
  };

  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 font-body select-none transition-all">
      {/* 1. Header Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F0BB58] border-[1.75px] border-[#24201D] flex items-center justify-center text-sm shadow-2xs shrink-0">
            <Radio className="w-4 h-4 text-[#24201D] stroke-[2.25]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold font-display text-[#24201D] leading-tight">
                Lofi Live Radio
              </h3>
              {isPlaying && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#FDE8E8] border border-[#E15A46] rounded-full text-[9px] font-black text-[#E15A46] leading-none animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E15A46]" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#6B635B] font-medium leading-none mt-0.5">
              24/7 Deep Work Audio
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Toggle Picture-in-Picture Live Video */}
          <button
            onClick={handleToggleVideo}
            title={isVideoVisible ? 'Скрыть видео' : 'Смотреть трансляцию'}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border-[1.5px] border-[#24201D] flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5 ${
              isVideoVisible
                ? 'bg-[#3D6B52] text-white shadow-none'
                : 'bg-[#FAF8F5] text-[#24201D] hover:bg-stone-100 shadow-2xs'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isVideoVisible ? 'Скрыть видео' : 'Видео'}</span>
          </button>

          {/* Stations Drawer Toggle */}
          <button
            onClick={() => {
              playClickSound();
              setIsStationsOpen(!isStationsOpen);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-[1.5px] border-[#24201D] flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5 ${
              isStationsOpen
                ? 'bg-[#24201D] text-[#FAF8F5]'
                : 'bg-[#FAF8F5] text-[#24201D] hover:bg-stone-100 shadow-2xs'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Станции</span>
          </button>
        </div>
      </div>

      {/* 2. Main Playing Radio Station Card */}
      <div className="p-3.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center gap-3">
          {/* Station Artwork Thumbnail */}
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl border-[1.75px] border-[#24201D] overflow-hidden shadow-2xs shrink-0 bg-black">
            <img
              src={currentStation.thumbnailUrl}
              alt={currentStation.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon-192x192.png';
              }}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                <span className="flex items-end gap-0.5 h-4">
                  <span className="w-1 bg-white rounded-full animate-pulse" style={{ height: '60%' }} />
                  <span className="w-1 bg-white rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.2s' }} />
                  <span className="w-1 bg-white rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.4s' }} />
                  <span className="w-1 bg-white rounded-full animate-pulse" style={{ height: '80%', animationDelay: '0.1s' }} />
                </span>
              </div>
            )}
          </div>

          {/* Station Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                isPlaying
                  ? 'bg-[#FDE8E8] border-[#E15A46] text-[#E15A46]'
                  : isBuffering
                  ? 'bg-[#FEF3C7] border-[#D97706] text-[#B45309]'
                  : 'bg-stone-200/60 border-stone-300 text-stone-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isPlaying ? 'bg-[#E15A46] animate-ping' : isBuffering ? 'bg-[#D97706] animate-pulse' : 'bg-stone-400'
                }`} />
                {isPlaying ? 'Live Stream' : isBuffering ? 'Buffering...' : 'Radio Off'}
              </span>

              {currentStation.isCustom && (
                <span className="px-1.5 py-0.5 bg-[#DDE8DE] border border-[#3D6B52] rounded-md text-[9px] font-bold text-[#3D6B52]">
                  Custom
                </span>
              )}
            </div>

            <h4 className="text-sm sm:text-base font-bold text-[#24201D] truncate mt-1">
              {currentStation.name}
            </h4>
            <p className="text-xs text-[#6B635B] font-medium truncate mt-0.5">
              {currentStation.subtitle || '24/7 Lofi Live Radio'}
            </p>
          </div>
        </div>

        {/* 3. Audio Visualizer Waves */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-white border border-[#24201D]/20 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#6B635B] uppercase tracking-wider">
              Sound Wave
            </span>
            <div className="flex items-end gap-1 h-3.5">
              {[40, 75, 90, 60, 100, 50, 85].map((height, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    isPlaying ? 'bg-[#3D6B52]' : 'bg-stone-300'
                  }`}
                  style={{
                    height: isPlaying ? `${height}%` : '20%',
                    animation: isPlaying ? `pulse 0.8s ease-in-out infinite alternate` : 'none',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <a
            href={`https://www.youtube.com/watch?v=${currentStation.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Открыть на YouTube"
            className="flex items-center gap-1 text-[10px] font-bold text-[#6B635B] hover:text-[#24201D] transition-colors"
          >
            <span>YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* 4. Volume Scrubber Bar */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
            className="w-7 h-7 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-[#24201D] cursor-pointer shrink-0 active:translate-y-0.5"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-[#E15A46]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={effectiveVolume}
            onChange={handleVolumeChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#3D6B52]"
            style={{
              background: `linear-gradient(to right, #3D6B52 ${effectiveVolume}%, #E4E4E7 ${effectiveVolume}%)`,
            }}
          />

          <span className="text-[10px] font-bold font-mono-num text-[#6B635B] w-8 text-right shrink-0">
            {effectiveVolume}%
          </span>
        </div>

        {/* 5. Playback Transport Controls */}
        <div className="flex items-center justify-between pt-1">
          {/* Prev Station */}
          <button
            onClick={handlePrevStation}
            className="w-12 h-11 rounded-xl bg-white border-[1.75px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer transition-all hover:bg-stone-50"
            title="Предыдущая станция"
          >
            <SkipBack className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Big Play/Pause Toggle Button */}
          <button
            onClick={handleTogglePlay}
            title={isPlaying ? 'Пауза' : 'Включить радио'}
            className="w-20 h-12 rounded-2xl bg-[#3D6B52] hover:bg-[#345B45] border-[2px] border-[#24201D] flex items-center justify-center text-white shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-white" />
            ) : (
              <Play className="w-6 h-6 fill-white ml-0.5" />
            )}
          </button>

          {/* Next Station */}
          <button
            onClick={handleNextStation}
            className="w-12 h-11 rounded-xl bg-white border-[1.75px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer transition-all hover:bg-stone-50"
            title="Следующая станция"
          >
            <SkipForward className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 6. Stations Drawer & Custom URL Input */}
      {isStationsOpen && (
        <div className="p-3 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3D6B52]" />
              <span className="text-xs font-bold text-[#24201D]">Выберите станцию</span>
            </div>

            <button
              onClick={() => {
                playClickSound();
                setIsAddingStation(!isAddingStation);
              }}
              className="px-2 py-1 bg-white hover:bg-stone-100 border border-[#24201D] rounded-lg text-[10px] font-bold text-[#24201D] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{isAddingStation ? 'Закрыть' : 'Добавить ссылку'}</span>
            </button>
          </div>

          {/* Add Custom Station Form */}
          {isAddingStation && (
            <form onSubmit={handleAddCustomStation} className="p-2.5 bg-white border border-[#24201D] rounded-xl space-y-2">
              <p className="text-[10px] font-bold text-[#6B635B]">
                Подключить свой YouTube стрим или видео
              </p>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... или ID"
                className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#24201D] rounded-lg text-xs font-medium text-[#24201D] outline-none"
              />
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Название радио (необязательно)"
                className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#24201D] rounded-lg text-xs font-medium text-[#24201D] outline-none"
              />
              {customError && (
                <p className="text-[10px] text-[#E15A46] font-bold">{customError}</p>
              )}
              <button
                type="submit"
                className="w-full py-1.5 bg-[#3D6B52] hover:bg-[#345B45] text-white border border-[#24201D] rounded-lg text-xs font-bold shadow-2xs active:translate-y-0.5 cursor-pointer"
              >
                + Подключить радио
              </button>
            </form>
          )}

          {/* Stations List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
            {stations.map((station) => {
              const isCurrent = station.id === currentStation.id;

              return (
                <div
                  key={station.id}
                  onClick={() => handleSelectStation(station)}
                  className={`p-2 rounded-xl border-[1.5px] border-[#24201D] flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-[#DDE8DE] shadow-[2px_2px_0px_#24201D] -translate-y-0.5'
                      : 'bg-white hover:bg-stone-50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={station.thumbnailUrl}
                      alt={station.name}
                      className="w-8 h-8 rounded-lg border border-[#24201D] object-cover shrink-0 bg-stone-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icon-192x192.png';
                      }}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#24201D]' : 'text-stone-800'}`}>
                          {station.name}
                        </p>
                        {isCurrent && isPlaying && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E15A46] animate-ping" />
                        )}
                      </div>
                      <p className="text-[10px] text-[#6B635B] truncate">
                        {station.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {station.isCustom && (
                      <button
                        onClick={(e) => handleDeleteStation(e, station.id)}
                        title="Удалить станцию"
                        className="w-6 h-6 rounded-md hover:bg-red-100 text-[#E15A46] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    <div
                      className={`w-6 h-6 rounded-lg border border-[#24201D] flex items-center justify-center text-xs shrink-0 ${
                        isCurrent ? 'bg-[#F0BB58] text-[#24201D]' : 'bg-[#FAF8F5] text-[#6B635B]'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Play className="w-3 h-3 fill-[#24201D] stroke-[#24201D]" />
                      ) : (
                        <Radio className="w-3 h-3" />
                      )}
                    </div>
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
