import React from 'react';

export interface AvatarOption {
  id: string;
  name: string;
  subtitle: string;
  bg: string;
  renderSvg: (className?: string) => React.ReactNode;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'bunny-scout',
    name: 'Bunny Scout',
    subtitle: 'Official Mascot',
    bg: '#E8DCFF',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="46" fill="#E8DCFF" stroke="#18181B" strokeWidth="4" />
        {/* Bunny Ears */}
        <ellipse cx="38" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
        <ellipse cx="38" cy="26" rx="3.5" ry="11" fill="#FCA5A5" />
        <ellipse cx="62" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
        <ellipse cx="62" cy="26" rx="3.5" ry="11" fill="#FCA5A5" />
        {/* Head */}
        <circle cx="50" cy="56" r="28" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
        {/* Cute Eyes */}
        <ellipse cx="40" cy="52" rx="4" ry="5" fill="#18181B" />
        <circle cx="39" cy="50" r="1.5" fill="#FFFFFF" />
        <ellipse cx="60" cy="52" rx="4" ry="5" fill="#18181B" />
        <circle cx="59" cy="50" r="1.5" fill="#FFFFFF" />
        {/* Nose & Mouth */}
        <ellipse cx="50" cy="59" rx="2.5" ry="1.8" fill="#F472B6" />
        <path d="M47 62 Q50 65 53 62" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
        {/* Cheeks */}
        <ellipse cx="34" cy="58" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.8" />
        <ellipse cx="66" cy="58" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'smug-goblin',
    name: 'Smug Heh',
    subtitle: 'Plan succeeded',
    bg: '#FEF08A',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="46" fill="#FEF08A" stroke="#18181B" strokeWidth="4" />
        {/* Head */}
        <circle cx="50" cy="52" r="28" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
        {/* Smug Eyes */}
        <path d="M32 46 Q40 40 44 48" stroke="#18181B" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M68 46 Q60 40 56 48" stroke="#18181B" strokeWidth="3.5" strokeLinecap="round" />
        {/* Eyebrows */}
        <path d="M30 38 Q38 32 44 38" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M70 38 Q62 32 56 38" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        {/* Smug Grin */}
        <path d="M38 62 Q50 74 66 58" stroke="#18181B" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="34" cy="56" rx="4" ry="2" fill="#FCA5A5" />
        <ellipse cx="66" cy="56" rx="4" ry="2" fill="#FCA5A5" />
      </svg>
    ),
  },
  {
    id: 'turbo-dev',
    name: 'Caffeine Turbo',
    subtitle: '300mg Coffee Overdose',
    bg: '#FED7AA',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="46" fill="#FED7AA" stroke="#18181B" strokeWidth="4" />
        {/* Head */}
        <circle cx="50" cy="52" r="28" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
        {/* Giant Wide Eyes */}
        <circle cx="38" cy="48" r="9" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
        <circle cx="38" cy="48" r="3" fill="#18181B" />
        <circle cx="62" cy="48" r="9" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
        <circle cx="62" cy="48" r="3" fill="#18181B" />
        {/* Shaking Mouth */}
        <path d="M38 66 L44 63 L50 67 L56 63 L62 66" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        {/* Sweat Drop */}
        <path d="M72 36 Q75 42 72 46 Q69 42 72 36 Z" fill="#60A5FA" stroke="#18181B" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'cool-hacker',
    name: 'Cyber Shades',
    subtitle: 'Deployed on Friday',
    bg: '#BAE6FD',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="46" fill="#BAE6FD" stroke="#18181B" strokeWidth="4" />
        {/* Head */}
        <circle cx="50" cy="52" r="28" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
        {/* Pixel / Black Sunglasses */}
        <path d="M26 44 L48 44 L44 56 L28 56 Z" fill="#18181B" />
        <path d="M52 44 L74 44 L72 56 L56 56 Z" fill="#18181B" />
        <rect x="44" y="46" width="12" height="3" fill="#18181B" />
        {/* Glare Line on Glasses */}
        <line x1="30" y1="47" x2="38" y2="53" stroke="#FFFFFF" strokeWidth="1.5" />
        <line x1="58" y1="47" x2="66" y2="53" stroke="#FFFFFF" strokeWidth="1.5" />
        {/* Confident Smirk */}
        <path d="M42 66 Q52 70 58 64" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'zen-capybara',
    name: 'Zen Capy',
    subtitle: 'Zero stress, maximum flow',
    bg: '#D1FBE4',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="46" fill="#D1FBE4" stroke="#18181B" strokeWidth="4" />
        {/* Capybara Snout & Head */}
        <rect x="28" y="38" width="44" height="36" rx="14" fill="#D97706" stroke="#18181B" strokeWidth="3" />
        <ellipse cx="50" cy="62" rx="18" ry="12" fill="#B45309" />
        {/* Closed Peaceful Eyes */}
        <path d="M34 46 Q40 50 44 46" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M56 46 Q60 50 66 46" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        {/* Little Orange on Head */}
        <circle cx="50" cy="28" r="8" fill="#F97316" stroke="#18181B" strokeWidth="2" />
        <path d="M50 20 Q54 18 56 22" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
        {/* Nose Dots */}
        <circle cx="46" cy="60" r="1.5" fill="#18181B" />
        <circle cx="54" cy="60" r="1.5" fill="#18181B" />
      </svg>
    ),
  },
  {
    id: 'panic-screaming',
    name: 'Panic Rush',
    subtitle: 'Deadline in 5 minutes',
    bg: '#FCE7F3',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="46" fill="#FCE7F3" stroke="#18181B" strokeWidth="4" />
        {/* Ghost / Screaming Chibi */}
        <circle cx="50" cy="50" r="28" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
        {/* Dot Eyes */}
        <circle cx="38" cy="42" r="4" fill="#18181B" />
        <circle cx="62" cy="42" r="4" fill="#18181B" />
        {/* Screaming O Mouth */}
        <ellipse cx="50" cy="62" rx="10" ry="14" fill="#18181B" />
        <ellipse cx="50" cy="68" rx="6" ry="6" fill="#F43F5E" />
        {/* Panic Hands on Face */}
        <ellipse cx="26" cy="54" rx="5" ry="8" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
        <ellipse cx="74" cy="54" rx="5" ry="8" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: 'cozy-hoodie',
    name: 'Cozy Blanket',
    subtitle: 'Hibernating under warm blanket',
    bg: '#DDD6FE',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="46" fill="#DDD6FE" stroke="#18181B" strokeWidth="4" />
        {/* Blanket Hood */}
        <path d="M20 60 Q20 26 50 26 Q80 26 80 60 Q70 80 50 80 Q30 80 20 60 Z" fill="#8B5CF6" stroke="#18181B" strokeWidth="3" />
        {/* Peeking Face */}
        <ellipse cx="50" cy="56" rx="20" ry="16" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
        {/* Sleepy Eyes */}
        <path d="M38 52 Q44 56 48 52" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M52 52 Q56 56 62 52" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        {/* Rosy Cheeks */}
        <ellipse cx="36" cy="60" rx="3.5" ry="2" fill="#FCA5A5" />
        <ellipse cx="64" cy="60" rx="3.5" ry="2" fill="#FCA5A5" />
        {/* Tiny Snout */}
        <path d="M47 62 Q50 64 53 62" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'ninja-stealth',
    name: 'Stealth Ninja',
    subtitle: 'Silent bug exterminator',
    bg: '#E2E8F0',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="46" fill="#E2E8F0" stroke="#18181B" strokeWidth="4" />
        {/* Dark Ninja Mask */}
        <circle cx="50" cy="52" r="28" fill="#18181B" stroke="#18181B" strokeWidth="3" />
        {/* Headband */}
        <rect x="22" y="30" width="56" height="8" rx="4" fill="#EF4444" stroke="#18181B" strokeWidth="2" />
        {/* Eye Opening */}
        <ellipse cx="50" cy="48" rx="20" ry="8" fill="#FFFFFF" stroke="#18181B" strokeWidth="2" />
        {/* Focused Eyes */}
        <circle cx="42" cy="48" r="3" fill="#18181B" />
        <circle cx="58" cy="48" r="3" fill="#18181B" />
      </svg>
    ),
  },
];

export function getAvatarById(id?: string): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.id === id) || AVATAR_OPTIONS[0];
}
