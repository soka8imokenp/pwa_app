import React, { useState } from 'react';
import {
  Download,
  X,
  Sparkles,
  CheckCircle2,
  FileDown,
  Loader2,
  AlertCircle,
  PackageCheck,
  RotateCcw,
} from 'lucide-react';
import type { AppUpdateInfo } from '../../lib/appUpdater';
import { CURRENT_APP_VERSION } from '../../lib/appUpdater';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppUpdateInfo;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
}) => {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'completed' | 'error'>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [downloadedMb, setDownloadedMb] = useState<string>('0.0');
  const [totalMb, setTotalMb] = useState<string>(updateInfo.fileSizeMb || '7.3 MB');
  const [downloadedBlob, setDownloadedBlob] = useState<Blob | null>(null);
  const [downloadedBlobUrl, setDownloadedBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerBlobDownload = (blobUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 1000);
  };

  const handleStartInAppDownload = async () => {
    playClickSound();
    setDownloadStatus('downloading');
    setProgressPercent(0);
    setErrorMsg(null);

    try {
      const targetUrl = updateInfo.downloadUrl;
      const response = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      if (totalBytes > 0) {
        setTotalMb((totalBytes / (1024 * 1024)).toFixed(1) + ' MB');
      }

      if (!response.body) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setDownloadedBlob(blob);
        setDownloadedBlobUrl(url);
        setProgressPercent(100);
        setDownloadStatus('completed');
        playSuccessChime();
        return;
      }

      const reader = response.body.getReader();
      let receivedBytes = 0;
      const chunks: BlobPart[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value as BlobPart);
          receivedBytes += value.length;
          setDownloadedMb((receivedBytes / (1024 * 1024)).toFixed(1));

          if (totalBytes > 0) {
            const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
            setProgressPercent(percent);
          } else {
            setProgressPercent((prev) => Math.min(95, prev + 5));
          }
        }
      }

      const apkBlob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
      const apkUrl = URL.createObjectURL(apkBlob);
      setDownloadedBlob(apkBlob);
      setDownloadedBlobUrl(apkUrl);
      setProgressPercent(100);
      setDownloadStatus('completed');
      playSuccessChime();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2CE68D', '#FFE873', '#18181B'],
      });
    } catch (err: any) {
      console.warn('In-app stream download error:', err);
      setErrorMsg(err.message || 'Download interrupted. Tap below to retry.');
      setDownloadStatus('error');
    }
  };

  const handleInstall = async () => {
    playSuccessChime();
    try {
      const nativeInstaller = (window as any).AndroidAppInstaller;
      if (nativeInstaller) {
        if (downloadedBlob) {
          const base64Data = await blobToBase64(downloadedBlob);
          nativeInstaller.installApkBase64(base64Data, updateInfo.fileName);
        } else {
          nativeInstaller.downloadAndInstall(updateInfo.downloadUrl, updateInfo.fileName);
        }
        return;
      }

      // Web desktop fallback
      if (downloadedBlobUrl) {
        triggerBlobDownload(downloadedBlobUrl, updateInfo.fileName);
      }
    } catch (err) {
      console.warn('Package installer error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-sm bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 animate-in zoom-in-95 duration-150 relative">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F0BB58] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5 text-[#24201D] stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                New Update Available
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Official GitHub Release
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-stone-500 hover:text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Version Compare Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl text-center">
            <span className="text-[9px] font-extrabold uppercase text-[#6B635B] block">
              Installed
            </span>
            <span className="text-xs font-black font-mono-num text-[#24201D]">
              {CURRENT_APP_VERSION}
            </span>
          </div>

          <div className="p-2.5 bg-[#DDE8DE] border-[1.5px] border-[#24201D] rounded-2xl text-center shadow-2xs">
            <span className="text-[9px] font-extrabold uppercase text-[#2D503C] block">
              New Version
            </span>
            <span className="text-xs font-black font-mono-num text-[#2D503C]">
              {updateInfo.version}
            </span>
          </div>
        </div>

        {/* File Details Card */}
        <div className="p-3 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-2xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#24201D]">
            <div className="flex items-center gap-1.5 truncate max-w-[190px]">
              <FileDown className="w-3.5 h-3.5 text-[#3D6B52] shrink-0 stroke-[2.25]" />
              <span className="truncate">{updateInfo.fileName}</span>
            </div>
            <span className="font-mono-num text-[#6B635B] shrink-0 text-[10px]">
              {updateInfo.fileSizeMb}
            </span>
          </div>

          {/* Release Notes */}
          <div className="pt-2 border-t border-[#24201D]/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] block mb-1">
              Release Notes
            </span>
            <div className="text-[11px] font-medium text-stone-700 leading-snug space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {updateInfo.releaseNotes
                .split('\n')
                .filter((line) => line.trim().length > 0)
                .map((line, idx) => {
                  const cleanLine = line.replace(/^[•\-*#\s]+/, '').trim();
                  if (!cleanLine) return null;
                  return (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3D6B52] mt-1 shrink-0" />
                      <span className="text-[10.5px] leading-tight text-stone-700">{cleanLine}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Sleek Download & Progress Panel */}
        {(downloadStatus === 'downloading' || downloadStatus === 'completed') && (
          <div className="p-3.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl space-y-2 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-black text-[#24201D]">
              <span className="flex items-center gap-1.5">
                {downloadStatus === 'downloading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#854D0E]" />
                    <span>Downloading APK...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3D6B52] stroke-[2.5]" />
                    <span className="text-[#2D503C]">Ready to Install</span>
                  </>
                )}
              </span>
              <span
                className={`font-mono-num font-black ${
                  downloadStatus === 'completed' ? 'text-[#2D503C]' : 'text-[#854D0E]'
                }`}
              >
                {progressPercent}%
              </span>
            </div>

            {/* Progress Track */}
            <div className="w-full h-3 bg-white border border-[#24201D] rounded-full p-0.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F0BB58] via-[#E09F3E] to-[#3D6B52] rounded-full transition-all duration-200"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-bold text-[#6B635B] font-mono-num">
              <span>{downloadedMb} MB downloaded</span>
              <span>Total: {totalMb}</span>
            </div>
          </div>
        )}

        {/* Error Notification Box */}
        {downloadStatus === 'error' && (
          <div className="p-3 bg-[#F7E3DC] border-[1.5px] border-[#C25E40] rounded-2xl text-left space-y-1 text-[10px] text-[#C25E40] animate-in fade-in duration-150">
            <div className="flex items-center gap-1 font-black">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Download Interrupted</span>
            </div>
            <p className="leading-tight text-stone-700">
              {errorMsg || 'Connection error. Tap Retry Download below.'}
            </p>
          </div>
        )}

        {/* Action Buttons: Clean & Direct */}
        <div className="space-y-2 pt-1">
          {downloadStatus === 'idle' && (
            <button
              onClick={handleStartInAppDownload}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#3D6B52] hover:bg-[#345B45] text-white border-[2px] border-[#24201D] font-black font-display text-xs uppercase tracking-wider shadow-[3px_3px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download & Install APK</span>
            </button>
          )}

          {/* When completed, show the Install button with instant tactile response */}
          {downloadStatus === 'completed' && (
            <button
              onClick={handleInstall}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#3D6B52] hover:bg-[#345B45] text-white border-[2px] border-[#24201D] font-black font-display text-xs uppercase tracking-wider shadow-[3px_3px_0px_#24201D] active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center gap-2"
            >
              <PackageCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Install</span>
            </button>
          )}

          {downloadStatus === 'error' && (
            <button
              onClick={handleStartInAppDownload}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#F0BB58] hover:bg-[#E09F3E] text-[#24201D] border-[2px] border-[#24201D] font-black font-display text-xs uppercase tracking-wider shadow-[3px_3px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Retry Download</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
