import React from 'react';
import { Sparkles, Download, X, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import { AppVersionInfo, CURRENT_APP_VERSION } from '../../lib/updaterService';
import { playClickSound } from '../../lib/sound';

interface UpdateAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppVersionInfo | null;
}

export const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
}) => {
  if (!isOpen || !updateInfo) return null;

  const handleDownload = () => {
    playClickSound();
    if (updateInfo.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_system');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-body select-none">
      <div className="w-full max-w-sm bg-[#FAF7F2] border-[2px] border-[#18181B] rounded-3xl p-5 shadow-[4px_4px_0px_#18181B] space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-[1.5px_1.5px_0px_#18181B]">
              <ArrowUpCircle className="w-5 h-5 text-[#18181B] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display text-[#18181B] leading-tight">
                Update Available!
              </h3>
              <span className="text-[10px] font-bold text-purple-700">
                v{updateInfo.version} (current: v{CURRENT_APP_VERSION})
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-slate-500 hover:text-black cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Changelog Card */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl space-y-2 shadow-[1.5px_1.5px_0px_#18181B]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            What's New in this version:
          </span>

          <ul className="space-y-1.5 text-xs text-slate-800 font-medium">
            {updateInfo.changelog && updateInfo.changelog.length > 0 ? (
              updateInfo.changelog.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                  <span className="leading-tight">{item}</span>
                </li>
              ))
            ) : (
              <li className="text-slate-500 text-xs">Performance improvements and bug fixes.</li>
            )}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDownload}
            className="w-full py-3 px-4 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] border-[2px] border-[#18181B] text-xs font-bold text-[#18181B] flex items-center justify-center gap-2 shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all uppercase tracking-wider"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Download & Update APK</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-black cursor-pointer"
          >
            Remind Me Later
          </button>
        </div>

      </div>
    </div>
  );
};
