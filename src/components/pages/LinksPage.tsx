import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Check,
  Flame,
  Globe,
  Coffee,
  Play,
  Music,
  Code,
  MessageSquare,
  Link2,
  Bookmark,
  Heart,
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

const PRESET_LINK_STARTERS = [
  { title: 'Buy Me A Coffee', url: 'https://buymeacoffee.com', iconType: 'coffee', iconBg: '#FEF08A', category: 'support' },
  { title: "My YouTube Channel", url: 'https://youtube.com', iconType: 'play', iconBg: '#FECDD3', category: 'media' },
  { title: 'Focus Lo-Fi Beats', url: 'https://spotify.com', iconType: 'music', iconBg: '#DCFCE7', category: 'focus' },
  { title: 'GitHub Repository', url: 'https://github.com', iconType: 'code', iconBg: '#E9D5FF', category: 'code' },
  { title: 'Discord Community', url: 'https://discord.com', iconType: 'message', iconBg: '#E0E7FF', category: 'social' },
];

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
  const [newIconType, setNewIconType] = useState('link');
  const [newColor, setNewColor] = useState('#E9D5FF');

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
      colors: ['#BEF264', '#C084FC', '#FED7AA'],
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
      icon: newIconType,
      iconBg: newColor,
      category: 'general',
      clicks: 0,
    });

    playSuccessChime();
    setNewTitle('');
    setNewUrl('');
    setIsAddOpen(false);
  };

  const handleAddPreset = async (preset: typeof PRESET_LINK_STARTERS[0]) => {
    playSuccessChime();
    await onAddLink({
      title: preset.title,
      url: preset.url,
      icon: preset.iconType,
      iconBg: preset.iconBg,
      category: preset.category,
      clicks: 0,
    });
  };

  const renderLucideIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'coffee':
        return <Coffee className="w-5 h-5 text-amber-950 stroke-[2.25]" />;
      case 'play':
      case 'youtube':
        return <Play className="w-5 h-5 text-rose-950 fill-rose-600 stroke-[2.25]" />;
      case 'music':
      case 'spotify':
        return <Music className="w-5 h-5 text-emerald-950 stroke-[2.25]" />;
      case 'code':
      case 'github':
        return <Code className="w-5 h-5 text-purple-950 stroke-[2.25]" />;
      case 'message':
      case 'discord':
        return <MessageSquare className="w-5 h-5 text-indigo-950 stroke-[2.25]" />;
      case 'heart':
        return <Heart className="w-5 h-5 text-rose-600 fill-rose-400 stroke-[2.25]" />;
      case 'bookmark':
        return <Bookmark className="w-5 h-5 text-amber-950 stroke-[2.25]" />;
      case 'globe':
      case 'web':
        return <Globe className="w-5 h-5 text-sky-950 stroke-[2.25]" />;
      case 'link':
      default:
        return <Link2 className="w-5 h-5 text-purple-950 stroke-[2.25]" />;
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-28 font-body select-none">
      
      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        linksCount={links.length}
      />

      {/* 1. Header Hub Capsule */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2.25rem] p-4 shadow-[2.5px_2.5px_0px_#18181B] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FED7AA] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
              <Link2 className="w-6 h-6 text-orange-950 stroke-[2.25]" />
            </div>
            <div>
              <h2 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B] flex items-center gap-1.5">
                My Links & Bio Hub
                <Sparkles className="w-3.5 h-3.5 text-purple-700 fill-purple-300" />
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                {links.length} curated link capsules active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                playClickSound();
                setIsQrOpen(true);
              }}
              className="w-10 h-10 rounded-full bg-[#FAF7F2] hover:bg-[#FEF08A] text-[#18181B] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-xs active:translate-y-0.5 cursor-pointer shrink-0 transition-all"
              title="View QR Code"
            >
              <QrCode className="w-4 h-4 stroke-[2.25]" />
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsAddOpen(!isAddOpen);
              }}
              className="h-10 px-4 rounded-full bg-[#C084FC] hover:bg-[#B366FA] text-[#18181B] border-[1.75px] border-[#18181B] text-xs font-black shadow-xs active:translate-y-0.5 cursor-pointer shrink-0 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Link</span>
            </button>
          </div>
        </div>

        {/* Search Capsule Bar */}
        <div className="bg-[#FAF7F2] border border-[#18181B]/15 rounded-full px-3.5 py-1.5 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 stroke-[2.5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links and bio shortcuts..."
            className="w-full text-xs font-bold bg-transparent outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 2. Expandable Add Custom Link Panel */}
      {isAddOpen && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white border-[1.75px] border-[#18181B] rounded-[2rem] p-4 shadow-[2px_2px_0px_#18181B] space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
              New Link Capsule
            </h3>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="text-xs font-bold text-slate-400 hover:text-[#18181B]"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Link Title (e.g. Buy Me A Coffee)"
              className="w-full px-3.5 py-2.5 bg-[#FAF7F2] text-xs font-bold rounded-2xl border border-[#18181B]/20 outline-none"
              required
            />
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/profile"
              className="w-full px-3.5 py-2.5 bg-[#FAF7F2] text-xs font-bold rounded-2xl border border-[#18181B]/20 outline-none font-mono-num"
              required
            />
          </div>

          {/* Lucide Icon Type & Color Selector */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase text-slate-400">Icon:</span>
              {[
                { id: 'coffee', icon: <Coffee className="w-3.5 h-3.5 stroke-[2.25]" /> },
                { id: 'play', icon: <Play className="w-3.5 h-3.5 stroke-[2.25]" /> },
                { id: 'music', icon: <Music className="w-3.5 h-3.5 stroke-[2.25]" /> },
                { id: 'code', icon: <Code className="w-3.5 h-3.5 stroke-[2.25]" /> },
                { id: 'message', icon: <MessageSquare className="w-3.5 h-3.5 stroke-[2.25]" /> },
                { id: 'globe', icon: <Globe className="w-3.5 h-3.5 stroke-[2.25]" /> },
                { id: 'link', icon: <Link2 className="w-3.5 h-3.5 stroke-[2.25]" /> },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setNewIconType(item.id)}
                  className={`w-7 h-7 rounded-full border text-xs flex items-center justify-center cursor-pointer ${
                    newIconType === item.id ? 'bg-[#FEF08A] border-[#18181B] shadow-2xs' : 'border-slate-200'
                  }`}
                >
                  {item.icon}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#BEF264] hover:bg-[#A3E635] text-[#18181B] border-[1.5px] border-[#18181B] rounded-full text-xs font-black shadow-xs cursor-pointer active:translate-y-0.5"
            >
              Save Link
            </button>
          </div>
        </form>
      )}

      {/* 3. Fast Link Starters with Lucide Icons (1-Tap Add) */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 px-2">
          <Globe className="w-3.5 h-3.5 text-purple-700 stroke-[2.25]" />
          <span className="text-[10px] font-black font-display uppercase tracking-wider text-slate-500">
            Suggested Presets (1-Tap Add)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {PRESET_LINK_STARTERS.slice(0, 4).map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleAddPreset(preset)}
              className="p-2.5 bg-white/90 hover:bg-white border border-[#18181B]/15 hover:border-[#18181B] rounded-2xl flex items-center justify-between text-left shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center border border-[#18181B]/20"
                  style={{ backgroundColor: preset.iconBg }}
                >
                  {renderLucideIcon(preset.iconType)}
                </div>
                <span className="text-[10px] font-extrabold text-[#18181B] truncate">
                  {preset.title}
                </span>
              </div>
              <span className="w-5 h-5 rounded-full bg-slate-50 group-hover:bg-[#E9D5FF] border border-[#18181B]/20 flex items-center justify-center text-[10px] font-black shrink-0 ml-1">
                +
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. List of Reference-Matched Link Capsule Cards with Lucide Icons */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black font-display uppercase tracking-wider text-slate-500">
            My Link Capsules ({filteredLinks.length})
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            Tap to open
          </span>
        </div>

        {filteredLinks.length === 0 ? (
          <div className="bg-white/90 border-[1.5px] border-dashed border-slate-300 rounded-[2rem] p-6 text-center shadow-xs space-y-1.5">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-slate-200 flex items-center justify-center mx-auto text-base">
              <Link2 className="w-6 h-6 text-slate-400 stroke-[2.25]" />
            </div>
            <h4 className="text-xs font-black font-display text-[#18181B]">
              No links found
            </h4>
            <p className="text-[11px] font-medium text-slate-500 max-w-xs mx-auto">
              Add your social media, donation links, or favorite tools above.
            </p>
          </div>
        ) : (
          filteredLinks.map((link) => (
            <div
              key={link.id}
              onClick={() => handleOpenLink(link)}
              className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-full px-4 py-3 shadow-[2.5px_2.5px_0px_#18181B] flex items-center justify-between gap-3 cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-xs transition-all group select-none"
            >
              {/* Left: Circular Lucide Icon Bubble */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div
                  className="w-11 h-11 rounded-full border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: link.iconBg || '#FEF08A' }}
                >
                  {renderLucideIcon(link.icon)}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-[#18181B] truncate group-hover:text-purple-900 transition-colors">
                    {link.title}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 truncate font-mono-num">
                    {link.url.replace(/^https?:\/\//, '')}
                  </p>
                </div>
              </div>

              {/* Right: Actions & Clicks */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Clicks badge */}
                {link.clicks !== undefined && link.clicks > 0 && (
                  <span className="text-[10px] font-black font-mono-num text-amber-900 bg-[#FEF08A] px-2 py-0.5 rounded-full border border-[#18181B]/20 flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-amber-600 fill-amber-500 stroke-[2.25]" />
                    {link.clicks}
                  </span>
                )}

                {/* Copy Button */}
                <button
                  onClick={(e) => handleCopyLink(e, link)}
                  title="Copy link to clipboard"
                  className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-[#E9D5FF] border border-[#18181B]/20 flex items-center justify-center text-slate-600 hover:text-[#18181B] transition-colors cursor-pointer"
                >
                  {copiedId === link.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 stroke-[2.25]" />
                  )}
                </button>

                {/* Open in new tab button */}
                <button
                  onClick={() => handleOpenLink(link)}
                  title="Open in new tab"
                  className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-[#BEF264] border border-[#18181B]/20 flex items-center justify-center text-slate-600 hover:text-[#18181B] transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.25]" />
                </button>

                {/* Delete button */}
                {link.id && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onDeleteLink(link.id!);
                    }}
                    title="Delete link"
                    className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-rose-50 border border-slate-200 hover:border-rose-400 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.25]" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
