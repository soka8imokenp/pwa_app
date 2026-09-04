import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Radio,
  ListMusic,
  Plus,
  Trash2,
  ExternalLink,
  RotateCcw,
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
    volume,
    isMuted,
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
      setCustomError('Некорректная ссылка на YouTube');
      return;
    }

    const success = musicPlayer.addCustomStation(customUrl, customName);
    if (success) {
      setCustomUrl('');
      setCustomName('');
    } else {
      setCustomError('Не удалось добавить станцию');
    }
  };

  const handleDeleteStation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    playClickSound();
    musicPlayer.deleteStation(id);
  };

  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 font-body select-none transition-all">
      {/* 1. Header Controls (No TV button, No LIVE badge) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F0BB58] border-[1.75px] border-[#24201D] flex items-center justify-center text-sm shadow-2xs shrink-0">
            <Radio className="w-4 h-4 text-[#24201D] stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-display text-[#24201D] leading-tight">
              Lofi Radio
            </h3>
            <p className="text-[10px] text-[#6B635B] font-medium leading-none mt-0.5">
              24/7 Поток
            </p>
          </div>
        </div>

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
          <span>Станции ({stations.length})</span>
        </button>
      </div>

      {/* 2. Main Playing Radio Card (Clean Text, No Image, No Live Stream Badge) */}
      <div className="p-4 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-base sm:text-lg font-bold font-display text-[#24201D] truncate">
              {currentStation.name}
            </h4>

            {/* Sound Wave Visualizer */}
            <div className="flex items-end gap-1 h-3.5 shrink-0 px-2 py-1 bg-white border border-[#24201D]/20 rounded-lg">
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

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#6B635B] font-medium truncate">
              {currentStation.subtitle || '24/7 Lofi Radio'}
            </p>
            <a
              href={`https://www.youtube.com/watch?v=${currentStation.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Открыть на YouTube"
              className="flex items-center gap-1 text-[10px] font-bold text-[#6B635B] hover:text-[#24201D] transition-colors shrink-0"
            >
              <span>YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Volume Scrubber Bar */}
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

        {/* Transport Controls */}
        <div className="flex items-center justify-between pt-0.5">
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

      {/* 3. Stations Drawer (No "Выберите станцию" header, No images, No top cropping, Delete any station) */}
      {isStationsOpen && (
        <div className="p-3.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 animate-in fade-in duration-150 overflow-visible">
          {/* Add Link Form - Compact & Pleasant */}
          <div className="space-y-1.5">
            <form onSubmit={handleAddCustomStation} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Ссылка на YouTube или ID..."
                className="flex-1 px-3 py-2 bg-white border border-[#24201D] rounded-xl text-xs font-medium text-[#24201D] outline-none placeholder:text-stone-400"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Название (опц.)"
                  className="w-28 sm:w-32 px-3 py-2 bg-white border border-[#24201D] rounded-xl text-xs font-medium text-[#24201D] outline-none placeholder:text-stone-400"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#3D6B52] hover:bg-[#345B45] text-white border border-[#24201D] rounded-xl text-xs font-bold shadow-2xs active:translate-y-0.5 cursor-pointer shrink-0 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>
            </form>
            {customError && (
              <p className="text-[10px] text-[#E15A46] font-bold px-1">{customError}</p>
            )}
          </div>

          {/* Stations List without images */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pt-1 pb-1 px-0.5">
            {stations.map((station) => {
              const isCurrent = station.id === currentStation.id;

              return (
                <div
                  key={station.id}
                  onClick={() => handleSelectStation(station)}
                  className={`p-2.5 rounded-xl border-[1.5px] border-[#24201D] flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-[#DDE8DE] shadow-[2px_2px_0px_#24201D]'
                      : 'bg-white hover:bg-stone-50 shadow-2xs'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#24201D]' : 'text-stone-800'}`}>
                        {station.name}
                      </p>
                      {isCurrent && isPlaying && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3D6B52] animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#6B635B] truncate mt-0.5">
                      {station.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Delete station button (allowed for any station if more than 1) */}
                    {stations.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteStation(e, station.id)}
                        title="Удалить станцию"
                        className="w-7 h-7 rounded-lg hover:bg-red-50 text-stone-400 hover:text-[#E15A46] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

          {/* Reset to defaults button */}
          <div className="flex justify-end pt-0.5">
            <button
              onClick={() => {
                playClickSound();
                musicPlayer.resetStationsToDefault();
              }}
              className="text-[10px] font-bold text-[#6B635B] hover:text-[#24201D] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить станции по умолчанию</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
