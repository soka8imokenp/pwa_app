import React from 'react';
import {
  Download,
  X,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  FileDown,
  ArrowRight,
} from 'lucide-react';
import type { AppUpdateInfo } from '../../lib/telegramUpdater';
import { CURRENT_APP_VERSION } from '../../lib/telegramUpdater';
import { playClickSound, playSuccessChime } from '../../lib/sound';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppUpdateInfo;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
}) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    playSuccessChime();
    window.open(updateInfo.downloadUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#18181B]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-sm bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 animate-in zoom-in-95 duration-150 relative">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5 text-[#18181B] stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                New Update Available
              </h3>
              <p className="text-[10px] font-bold text-slate-400">
                Direct from Telegram Group
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-slate-500 hover:text-[#18181B] shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Version Compare Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-[#FAF7F2] border border-[#18181B]/20 rounded-2xl text-center">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
              Installed
            </span>
            <span className="text-xs font-black font-mono-num text-slate-600">
              {CURRENT_APP_VERSION}
            </span>
          </div>

          <div className="p-2.5 bg-[#D1FBE4] border-[1.5px] border-[#18181B] rounded-2xl text-center shadow-2xs">
            <span className="text-[9px] font-extrabold uppercase text-emerald-800 block">
              New Version
            </span>
            <span className="text-xs font-black font-mono-num text-emerald-950">
              {updateInfo.version}
            </span>
          </div>
        </div>

        {/* File Details Card */}
        <div className="p-3 bg-[#FAF7F2] border-[1.5px] border-[#18181B] rounded-2xl space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#18181B]">
            <div className="flex items-center gap-1.5 truncate max-w-[190px]">
              <FileDown className="w-3.5 h-3.5 text-purple-700 shrink-0 stroke-[2.25]" />
              <span className="truncate">{updateInfo.fileName}</span>
            </div>
            <span className="font-mono-num text-slate-500 shrink-0 text-[10px]">
              {updateInfo.fileSizeMb}
            </span>
          </div>

          {/* Release Notes */}
          <div className="pt-2 border-t border-[#18181B]/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              Release Notes
            </span>
            <p className="text-[11px] font-medium text-slate-700 leading-snug whitespace-pre-wrap max-h-24 overflow-y-auto pr-1">
              {updateInfo.releaseNotes}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDownload}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] text-[#18181B] border-[2px] border-[#18181B] font-black font-display text-xs uppercase tracking-wider shadow-[3px_3px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Download & Install APK</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full py-1 text-xs font-bold text-slate-400 hover:text-[#18181B] cursor-pointer"
          >
            Remind Me Later
          </button>
        </div>

      </div>
    </div>
  );
};
