import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Plus,
  Trash2,
  Search,
  Check,
  Globe,
  Coffee,
  Play,
  Music,
  Code,
  Link2,
  QrCode,
} from 'lucide-react';
import type { LinkItem } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { QRCodeModal } from '../modals/QRCodeModal';
import confetti from 'canvas-confetti';

interface LinksPageProps {
  links: LinkItem[];
  onAddLink: (link: Omit<LinkItem, 'id' | 'createdAt'>) => Promise<any>;
  onDeleteLink: (id: number) => Promise<any>;
  onIncrementClicks: (id: number) => Promise<any>;
}

export const LinksPage: React.FC<LinksPageProps> = ({
  links,
  onAddLink,
  onDeleteLink,
  onIncrementClicks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newColor, setNewColor] = useState('#FFE873');

  const filteredLinks = links.filter((l) =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenLink = (link: LinkItem) => {
    playClickSound();
    if (link.id) {
      onIncrementClicks(link.id);
    }
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (e: React.MouseEvent, link: LinkItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.url);
    if (link.id) setCopiedId(link.id);
    playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    let formattedUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    await onAddLink({
      title: newTitle.trim(),
      url: formattedUrl,
      icon: 'link',
      iconBg: newColor,
      category: 'general',
      clicks: 0,
    });

    setNewTitle('');
    setNewUrl('');
    setIsAddOpen(false);
    playSuccessChime();
  };

  return (
    <div className="w-full space-y-4 pb-20 font-body select-none">
      {/* 1. Header Card */}
      <div className="neo-card p-4 bg-white flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Bio Hub & Bookmarks
          </span>
          <h2 className="text-base font-bold font-display text-[#18181B] mt-0.5">
            {links.length} Saved Links
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClickSound();
              setIsQrOpen(true);
            }}
            className="w-8 h-8 rounded-lg bg-[#E8DCFF] hover:bg-[#D8C4FF] border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B] cursor-pointer"
            title="Generate QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              playClickSound();
              setIsAddOpen(!isAddOpen);
            }}
            className="px-3 py-1.5 bg-[#FFE873] hover:bg-[#FCD34D] neo-btn flex items-center gap-1 text-xs text-[#18181B] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </div>
      </div>

      {/* Add Link Form Collapsible */}
      {isAddOpen && (
        <form onSubmit={handleCreateSubmit} className="neo-card p-4 bg-white space-y-3">
          <h3 className="text-xs font-bold font-display text-[#18181B] uppercase tracking-wider">
            Create New Link
          </h3>

          <div className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Link Title (e.g. My GitHub)"
              className="w-full px-3.5 py-2 bg-white border-[1.75px] border-[#18181B] rounded-xl text-xs font-medium text-[#18181B] placeholder:text-slate-400 focus:outline-none"
            />
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 bg-white border-[1.75px] border-[#18181B] rounded-xl text-xs font-medium text-[#18181B] placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              {['#FFE873', '#E8DCFF', '#D1FBE4', '#FED7AA', '#BAE6FD'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-lg border-[1.5px] border-[#18181B] transition-all cursor-pointer ${
                    newColor === c ? 'scale-110 shadow-[1px_1px_0px_#18181B]' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 font-bold hover:underline cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#FFE873] neo-btn text-xs text-[#18181B] cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 2. Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search saved links..."
          className="w-full pl-10 pr-4 py-2 bg-white border-[1.75px] border-[#18181B] rounded-xl text-xs font-medium text-[#18181B] placeholder:text-slate-400 shadow-[1.5px_1.5px_0px_#18181B] focus:outline-none"
        />
      </div>

      {/* 3. Links List */}
      <div className="space-y-2">
        {filteredLinks.length === 0 ? (
          <div className="neo-card p-8 text-center bg-white border-dashed space-y-2">
            <Globe className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold font-display text-slate-500">
              No links saved yet
            </h4>
          </div>
        ) : (
          filteredLinks.map((link) => (
            <div
              key={link.id}
              onClick={() => handleOpenLink(link)}
              className="neo-card p-3.5 bg-white flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl border-[1.5px] border-[#18181B] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#18181B]"
                  style={{ backgroundColor: link.iconBg || '#FFE873' }}
                >
                  <Link2 className="w-4 h-4 text-[#18181B]" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-[#18181B] truncate">
                    {link.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {link.url.replace(/^https?:\/\//, '')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => handleCopyLink(e, link)}
                  title="Copy URL"
                  className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-slate-100 border border-slate-200 hover:border-[#18181B] flex items-center justify-center text-slate-600 cursor-pointer"
                >
                  {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => handleOpenLink(link)}
                  title="Open Link"
                  className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-slate-100 border border-slate-200 hover:border-[#18181B] flex items-center justify-center text-slate-600 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                {link.id && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onDeleteLink(link.id!);
                    }}
                    title="Delete"
                    className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-400 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isQrOpen && (
        <QRCodeModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          hubUrl={typeof window !== 'undefined' ? window.location.href : 'https://kairo.app'}
          linksCount={links.length}
        />
      )}
    </div>
  );
};
