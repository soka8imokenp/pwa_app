import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Plus,
  Trash2,
  Search,
  Check,
  Globe,
  Link2,
  QrCode,
  Tv,
  BookOpen,
  Film,
  Bot,
  Library,
  Compass,
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

interface EcosystemService {
  id: string;
  title: string;
  badge: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  bg: string;
  borderColor: string;
}

const ECOSYSTEM_SERVICES: EcosystemService[] = [
  {
    id: 'tv',
    title: 'Kawaii TV',
    badge: 'Watch Party & Streams',
    description: 'Anime streaming, sync rooms & creator tiers',
    url: 'https://tv.kawaii.uz',
    icon: <Tv className="w-5 h-5 text-[#2D503C] stroke-[2.25]" />,
    bg: 'bg-[#DDE8DE]',
    borderColor: 'border-[#24201D]',
  },
  {
    id: 'manga',
    title: 'Manga Hub',
    badge: 'Reader & Novels',
    description: 'Manga, light novels, webtoons & translations',
    url: 'https://manga.kawaii.uz',
    icon: <BookOpen className="w-5 h-5 text-[#854D0E] stroke-[2.25]" />,
    bg: 'bg-[#FBECCF]',
    borderColor: 'border-[#24201D]',
  },
  {
    id: 'anime',
    title: 'Anime Hub',
    badge: 'Catalog & Dubs',
    description: 'Release calendar, anime database & dub studios',
    url: 'https://anime.kawaii.uz',
    icon: <Film className="w-5 h-5 text-[#C25E40] stroke-[2.25]" />,
    bg: 'bg-[#F7E3DC]',
    borderColor: 'border-[#24201D]',
  },
  {
    id: 'bot',
    title: 'Kawaii Bot',
    badge: 'Assistant & Tools',
    description: 'Telegram bot assistant, release alerts & automation',
    url: 'https://bot.kawaii.uz',
    icon: <Bot className="w-5 h-5 text-[#2A495E] stroke-[2.25]" />,
    bg: 'bg-[#DEE8EF]',
    borderColor: 'border-[#24201D]',
  },
  {
    id: 'wiki',
    title: 'Kawaii Wiki',
    badge: 'Knowledge Base',
    description: 'Community guides, archive & anime encyclopaedia',
    url: 'https://wiki.kawaii.uz',
    icon: <Library className="w-5 h-5 text-[#854D0E] stroke-[2.25]" />,
    bg: 'bg-[#FBECCF]',
    borderColor: 'border-[#24201D]',
  },
  {
    id: 'portal',
    title: 'Kawaii.uz',
    badge: 'Central Portal',
    description: 'Home of the anime community & ecosystem hub',
    url: 'https://kawaii.uz',
    icon: <Compass className="w-5 h-5 text-[#2D503C] stroke-[2.25]" />,
    bg: 'bg-[#FAF8F5]',
    borderColor: 'border-[#24201D]',
  },
];

export const LinksPage: React.FC<LinksPageProps> = ({
  links,
  onAddLink,
  onDeleteLink,
  onIncrementClicks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedEcosystemId, setCopiedEcosystemId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Form State for Custom Link
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newColor, setNewColor] = useState('#3D6B52');

  const filteredCustomLinks = links.filter((l) =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEcosystem = ECOSYSTEM_SERVICES.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.badge.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenUrl = (url: string, id?: number) => {
    playClickSound();
    if (id) {
      onIncrementClicks(id);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (e: React.MouseEvent, url: string, customId?: number, ecoId?: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    if (customId) setCopiedId(customId);
    if (ecoId) setCopiedEcosystemId(ecoId);
    playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
    setTimeout(() => {
      setCopiedId(null);
      setCopiedEcosystemId(null);
    }, 2000);
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
    <div className="w-full space-y-5 pb-20 font-body select-none">
      {/* 1. Header Card */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block font-display">
            Kawaii Ecosystem
          </span>
          <h2 className="text-base font-bold font-display text-[#24201D] mt-0.5">
            Portals & Hub
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClickSound();
              setIsQrOpen(true);
            }}
            className="w-8 h-8 rounded-xl bg-[#DDE8DE] hover:bg-[#C9DCCB] border-[1.5px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs cursor-pointer"
            title="Generate QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              playClickSound();
              setIsAddOpen(!isAddOpen);
            }}
            className="px-3 py-1.5 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.5px] border-[#24201D] rounded-xl flex items-center gap-1 text-xs font-bold shadow-2xs active:translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ecosystem services & links..."
          className="w-full pl-10 pr-4 py-2 bg-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-medium text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
        />
      </div>

      {/* 2. Official Ecosystem Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] font-display">
            Official Services
          </span>
          <span className="text-[10px] font-bold text-stone-400">
            {filteredEcosystem.length} Platforms
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredEcosystem.map((service) => (
            <div
              key={service.id}
              onClick={() => handleOpenUrl(service.url)}
              className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex flex-col justify-between gap-3 cursor-pointer hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl border-[1.5px] ${service.borderColor} ${service.bg} flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#24201D] leading-tight">
                      {service.title}
                    </h3>
                    <span className="text-[9px] font-bold text-[#6B635B] uppercase tracking-tight block mt-0.5">
                      {service.badge}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleCopyLink(e, service.url, undefined, service.id)}
                    title="Copy URL"
                    className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-stone-200 hover:border-[#24201D] flex items-center justify-center text-stone-600 cursor-pointer"
                  >
                    {copiedEcosystemId === service.id ? (
                      <Check className="w-3.5 h-3.5 text-[#3D6B52]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenUrl(service.url)}
                    title="Open Service"
                    className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-stone-200 hover:border-[#24201D] flex items-center justify-center text-stone-600 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[#6B635B] font-medium leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Custom Personal Bookmarks */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] font-display">
            Personal Bookmarks
          </span>
          <span className="text-[10px] font-bold text-stone-400">
            {filteredCustomLinks.length} Saved
          </span>
        </div>

        {/* Add Link Form Collapsible */}
        {isAddOpen && (
          <form onSubmit={handleCreateSubmit} className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
            <h3 className="text-xs font-bold font-display text-[#24201D] uppercase tracking-wider">
              Create New Bookmark
            </h3>

            <div className="space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Bookmark Title (e.g. My GitHub)"
                className="w-full px-3.5 py-2 bg-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-medium text-[#24201D] placeholder:text-stone-400 focus:outline-none"
              />
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 bg-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-medium text-[#24201D] placeholder:text-stone-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {['#3D6B52', '#C25E40', '#F0BB58', '#476C85', '#8FA89B'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-lg border-[1.5px] border-[#24201D] transition-all cursor-pointer ${
                      newColor === c ? 'scale-110 shadow-2xs ring-1 ring-[#24201D]' : 'opacity-70'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#6B635B] font-bold hover:underline cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.5px] border-[#24201D] rounded-xl text-xs font-bold shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Links List */}
        <div className="space-y-2">
          {filteredCustomLinks.length === 0 ? (
            <div className="p-6 text-center bg-[#FAF8F5] border-[1.75px] border-dashed border-[#24201D]/25 rounded-2xl space-y-1.5">
              <Globe className="w-6 h-6 text-stone-300 mx-auto" />
              <h4 className="text-xs font-bold font-display text-[#6B635B]">
                No personal links yet
              </h4>
              <p className="text-[10px] text-stone-400">
                Tap «Add Link» above to pin your favorite tools or sites
              </p>
            </div>
          ) : (
            filteredCustomLinks.map((link) => (
              <div
                key={link.id}
                onClick={() => handleOpenUrl(link.url, link.id)}
                className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-xl shadow-2xs flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl border-[1.5px] border-[#24201D] flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: link.iconBg || '#DDE8DE' }}
                  >
                    <Link2 className="w-4 h-4 text-[#24201D]" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-[#24201D] truncate">
                      {link.title}
                    </h3>
                    <span className="text-[10px] text-stone-400 truncate block">
                      {link.url.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleCopyLink(e, link.url, link.id)}
                    title="Copy URL"
                    className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-stone-200 hover:border-[#24201D] flex items-center justify-center text-stone-600 cursor-pointer"
                  >
                    {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-[#3D6B52]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleOpenUrl(link.url, link.id)}
                    title="Open Link"
                    className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-stone-200 hover:border-[#24201D] flex items-center justify-center text-stone-600 cursor-pointer"
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
                      className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-rose-50 border border-stone-200 hover:border-rose-400 flex items-center justify-center text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isQrOpen && (
        <QRCodeModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          hubUrl={typeof window !== 'undefined' ? window.location.href : 'https://kawaii.uz'}
          linksCount={links.length + ECOSYSTEM_SERVICES.length}
        />
      )}
    </div>
  );
};
