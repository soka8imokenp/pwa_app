import React, { useState } from 'react';
import { QrCode, Copy, Check, X, Share2, Sparkles, Link2 } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  hubUrl?: string;
  linksCount: number;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  hubUrl = window.location.origin,
  linksCount,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    playSuccessChime();
    navigator.clipboard.writeText(hubUrl);
    setCopied(true);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#BEF264', '#C084FC', '#FED7AA'],
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate dynamic QR Code SVG url using standard QR service
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    hubUrl
  )}&color=18-18-27&bgcolor=FAF7F2&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-sm bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 text-center">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FED7AA] border-[1.5px] border-[#18181B] flex items-center justify-center text-xs">
              <QrCode className="w-4 h-4 text-orange-950 stroke-[2.25]" />
            </div>
            <span className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
              Share Hub QR Code
            </span>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B]/20 flex items-center justify-center text-slate-500 hover:text-[#18181B] cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* QR Code Canvas Frame */}
        <div className="p-4 bg-[#FAF7F2] border-[2px] border-[#18181B] rounded-3xl inline-block shadow-[2px_2px_0px_#18181B] my-1">
          <img
            src={qrApiUrl}
            alt="Link Hub QR Code"
            className="w-44 h-44 rounded-xl mx-auto mix-blend-multiply"
            loading="lazy"
          />
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-black text-purple-900 uppercase">
            <Link2 className="w-3 h-3" />
            <span>{linksCount} Active Capsules</span>
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-black font-display text-[#18181B]">
            Scan to Open Link-in-Bio Hub
          </h4>
          <p className="text-[10px] font-semibold text-slate-400 font-mono-num truncate max-w-xs mx-auto">
            {hubUrl}
          </p>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="w-full py-2.5 rounded-full bg-[#BEF264] hover:bg-[#A3E635] text-[#18181B] border-[1.75px] border-[#18181B] text-xs font-black shadow-xs active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 stroke-[2.25]" />
              <span>Copy Hub Link</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
};
