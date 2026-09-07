import React from 'react';

export interface AvatarOption {
  id: string;
  name: string;
  subtitle: string;
  bg: string;
  renderSvg: (className?: string) => React.ReactNode;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  // 1. Sumire Kitsune (Official Mascot)
  {
    id: 'sumire-scout',
    name: 'Sumire Kitsune',
    subtitle: 'Gentle Violet Spirit',
    bg: '#F3E8FF',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Soft Pastel Background Circle */}
        <circle cx="50" cy="50" r="48" fill="#EDE9FE" />
        
        {/* Fox Ears */}
        <path d="M30 46 L36 18 L50 36 Z" fill="#E07A5F" />
        <path d="M34 40 L37 24 L46 36 Z" fill="#FECDD3" />
        
        <path d="M70 46 L64 18 L50 36 Z" fill="#E07A5F" />
        <path d="M66 40 L63 24 L54 36 Z" fill="#FECDD3" />
        
        {/* Fox Head Base */}
        <ellipse cx="50" cy="58" rx="28" ry="24" fill="#E07A5F" />
        
        {/* Cream Cheeks & Muzzle */}
        <path d="M26 62 Q36 78 50 78 Q64 78 74 62 Q66 52 50 56 Q34 52 26 62 Z" fill="#FFFDF9" />
        
        {/* Eyes (Peaceful curved smile) */}
        <path d="M37 54 Q41 58 45 54" stroke="#3D261D" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M55 54 Q59 58 63 54" stroke="#3D261D" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Nose */}
        <ellipse cx="50" cy="65" rx="3" ry="2.2" fill="#3D261D" />
        
        {/* Rosy Cheeks */}
        <circle cx="33" cy="62" r="4" fill="#FDA4AF" opacity="0.6" />
        <circle cx="67" cy="62" r="4" fill="#FDA4AF" opacity="0.6" />
        
        {/* Sumire Violet Flower tucked behind ear */}
        <g transform="translate(64, 26)">
          <circle cx="0" cy="-4" r="3.5" fill="#8B5CF6" />
          <circle cx="4" cy="-1.5" r="3.5" fill="#A78BFA" />
          <circle cx="2.5" cy="3.5" r="3.5" fill="#8B5CF6" />
          <circle cx="-2.5" cy="3.5" r="3.5" fill="#7C3AED" />
          <circle cx="-4" cy="-1.5" r="3.5" fill="#A78BFA" />
          <circle cx="0" cy="0" r="2" fill="#FBBF24" />
        </g>
      </svg>
    ),
  },

  // 2. Kuro Neko (Midnight Cat)
  {
    id: 'kuro-neko',
    name: 'Kuro Neko',
    subtitle: 'Midnight Flow Cat',
    bg: '#E0E7FF',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="48" fill="#E0E7FF" />
        
        {/* Cat Ears */}
        <path d="M26 44 L32 20 L48 36 Z" fill="#2D3142" />
        <path d="M30 38 L34 25 L43 35 Z" fill="#FBCFE8" />
        
        <path d="M74 44 L68 20 L52 36 Z" fill="#2D3142" />
        <path d="M70 38 L66 25 L57 35 Z" fill="#FBCFE8" />
        
        {/* Cat Head */}
        <circle cx="50" cy="56" r="26" fill="#2D3142" />
        
        {/* Golden Almond Eyes */}
        <ellipse cx="38" cy="53" rx="5" ry="6.5" fill="#FBBF24" />
        <ellipse cx="38" cy="53" rx="2" ry="5.5" fill="#1E293B" />
        <circle cx="36.5" cy="51" r="1.5" fill="#FFFFFF" />
        
        <ellipse cx="62" cy="53" rx="5" ry="6.5" fill="#FBBF24" />
        <ellipse cx="62" cy="53" rx="2" ry="5.5" fill="#1E293B" />
        <circle cx="60.5" cy="51" r="1.5" fill="#FFFFFF" />
        
        {/* Tiny Pink Nose & Mouth */}
        <polygon points="50,62 47,59 53,59" fill="#F472B6" />
        <path d="M47 64 Q50 66 53 64" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Minimalist Soft Whiskers */}
        <line x1="22" y1="58" x2="31" y2="60" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <line x1="22" y1="64" x2="31" y2="63" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <line x1="78" y1="58" x2="69" y2="60" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <line x1="78" y1="64" x2="69" y2="63" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        
        {/* Golden Collar Tag */}
        <circle cx="50" cy="80" r="4.5" fill="#F59E0B" />
        <circle cx="50" cy="80" r="2" fill="#FEF3C7" />
      </svg>
    ),
  },

  // 3. Zen Capybara
  {
    id: 'zen-capy',
    name: 'Zen Capy',
    subtitle: 'Zero Stress & Flow',
    bg: '#DDE8DE',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="48" fill="#DDE8DE" />
        
        {/* Tiny Capy Ears */}
        <ellipse cx="28" cy="38" rx="5" ry="4" fill="#A5673F" />
        <ellipse cx="72" cy="38" rx="5" ry="4" fill="#A5673F" />
        
        {/* Head Shape */}
        <rect x="28" y="36" width="44" height="42" rx="16" fill="#C68B59" />
        
        {/* Snout Area */}
        <rect x="34" y="52" width="32" height="24" rx="10" fill="#A5673F" />
        
        {/* Zen Eyes (Pure Calm Curved Lines) */}
        <path d="M35 48 L43 48" stroke="#3D261D" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M57 48 L65 48" stroke="#3D261D" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Nostrils */}
        <ellipse cx="46" cy="62" rx="2" ry="1.5" fill="#3D261D" />
        <ellipse cx="54" cy="62" rx="2" ry="1.5" fill="#3D261D" />
        
        {/* Soft Blush */}
        <circle cx="32" cy="56" r="3.5" fill="#FDA4AF" opacity="0.6" />
        <circle cx="68" cy="56" r="3.5" fill="#FDA4AF" opacity="0.6" />
        
        {/* Yuzu Citrus on Head */}
        <circle cx="50" cy="27" r="9" fill="#F59E0B" />
        <ellipse cx="52" cy="25" rx="7" ry="5" fill="#FBBF24" />
        <path d="M50 18 Q54 15 56 18" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="18" r="1.5" fill="#047857" />
      </svg>
    ),
  },

  // 4. Mochi Panda
  {
    id: 'mochi-panda',
    name: 'Mochi Panda',
    subtitle: 'Gentle & Balanced',
    bg: '#FEE2E2',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="48" fill="#FEE2E2" />
        
        {/* Panda Ears */}
        <circle cx="28" cy="30" r="9" fill="#374151" />
        <circle cx="28" cy="30" r="5" fill="#4B5563" />
        <circle cx="72" cy="30" r="9" fill="#374151" />
        <circle cx="72" cy="30" r="5" fill="#4B5563" />
        
        {/* Round Mochi Face */}
        <circle cx="50" cy="56" r="28" fill="#FFFDF9" />
        
        {/* Panda Eye Patches */}
        <ellipse cx="38" cy="53" rx="7" ry="8" transform="rotate(-15 38 53)" fill="#374151" />
        <ellipse cx="62" cy="53" rx="7" ry="8" transform="rotate(15 62 53)" fill="#374151" />
        
        {/* Smiling Eyes inside patches */}
        <path d="M35 52 Q38 55 41 52" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <path d="M59 52 Q62 55 65 52" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        
        {/* Cute Button Nose & Mouth */}
        <ellipse cx="50" cy="62" rx="3" ry="2" fill="#374151" />
        <path d="M47 66 Q50 68 53 66" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Cheeks */}
        <circle cx="30" cy="63" r="4" fill="#FB7185" opacity="0.5" />
        <circle cx="70" cy="63" r="4" fill="#FB7185" opacity="0.5" />
        
        {/* Tiny Bamboo Leaf */}
        <path d="M68 68 Q76 64 78 72 Q72 74 68 68 Z" fill="#10B981" />
      </svg>
    ),
  },

  // 5. Komorebi Sprout (Forest Guardian)
  {
    id: 'komorebi-sprout',
    name: 'Komorebi Sprout',
    subtitle: 'Nature & Focus Rhythm',
    bg: '#DCFCE7',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="48" fill="#DCFCE7" />
        
        {/* Body Shape */}
        <path d="M50 26 Q72 38 72 62 Q72 82 50 82 Q28 82 28 62 Q28 38 50 26 Z" fill="#3D6B52" />
        
        {/* Cream Belly */}
        <ellipse cx="50" cy="66" rx="16" ry="12" fill="#FDFBF7" />
        
        {/* Belly Marks */}
        <path d="M46 62 L48 64 L50 62" stroke="#3D6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 62 L52 64 L54 62" stroke="#3D6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Curious Eyes */}
        <circle cx="42" cy="48" r="4" fill="#FDFBF7" />
        <circle cx="42.5" cy="48" r="2" fill="#1A2E22" />
        <circle cx="43.5" cy="47" r="0.8" fill="#FFFFFF" />
        
        <circle cx="58" cy="48" r="4" fill="#FDFBF7" />
        <circle cx="57.5" cy="48" r="2" fill="#1A2E22" />
        <circle cx="56.5" cy="47" r="0.8" fill="#FFFFFF" />
        
        {/* Tiny Smile */}
        <path d="M48 54 Q50 56 52 54" stroke="#1A2E22" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Leaf Sprout on Head */}
        <path d="M50 26 C50 16 42 14 42 14 C42 14 46 22 50 26 Z" fill="#22C55E" />
        <path d="M50 26 C50 14 60 12 60 12 C60 12 55 21 50 26 Z" fill="#16A34A" />
      </svg>
    ),
  },

  // 6. Tori Dawn (Golden Finch)
  {
    id: 'tori-finch',
    name: 'Tori Dawn',
    subtitle: 'Morning Productivity',
    bg: '#FEF3C7',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="48" fill="#FEF3C7" />
        
        {/* Plump Bird Body */}
        <circle cx="50" cy="54" r="26" fill="#F59E0B" />
        
        {/* Cream Belly */}
        <path d="M32 62 Q50 82 66 62 Q56 52 50 52 Q38 52 32 62 Z" fill="#FFFBEB" />
        
        {/* Feathery Head Tuft */}
        <path d="M50 28 Q54 18 56 22 Q54 26 50 28 Z" fill="#D97706" />
        <path d="M48 28 Q44 20 46 23 Q47 26 48 28 Z" fill="#F59E0B" />
        
        {/* Wing */}
        <ellipse cx="64" cy="56" rx="9" ry="14" transform="rotate(18 64 56)" fill="#EA580C" />
        
        {/* Big Curious Eye */}
        <circle cx="40" cy="48" r="5" fill="#1F2937" />
        <circle cx="39" cy="46" r="1.8" fill="#FFFFFF" />
        
        {/* Cheerful Beak */}
        <polygon points="26,50 34,46 34,54" fill="#FB923C" />
        
        {/* Rosy Cheek */}
        <circle cx="44" cy="56" r="3.5" fill="#FDA4AF" opacity="0.7" />
      </svg>
    ),
  },

  // 7. Tsuki Moon (Dreamy Star Rabbit)
  {
    id: 'tsuki-bunny',
    name: 'Tsuki Moon',
    subtitle: 'Serene Night Flow',
    bg: '#DDD6FE',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="48" fill="#DDD6FE" />
        
        {/* Long Graceful Bunny Ears */}
        <path d="M34 50 C26 30 32 14 40 16 C46 18 42 34 38 50 Z" fill="#FFFDF9" />
        <path d="M35 44 C30 30 34 20 38 21 C41 22 40 32 37 44 Z" fill="#FBCFE8" />
        
        <path d="M66 50 C74 30 68 14 60 16 C54 18 58 34 62 50 Z" fill="#FFFDF9" />
        <path d="M65 44 C70 30 66 20 62 21 C59 22 60 32 63 44 Z" fill="#FBCFE8" />
        
        {/* Round Head */}
        <circle cx="50" cy="60" r="24" fill="#FFFDF9" />
        
        {/* Peaceful Sleepy Eyes */}
        <path d="M38 58 Q43 62 47 58" stroke="#4C1D95" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M53 58 Q57 62 62 58" stroke="#4C1D95" strokeWidth="2.2" strokeLinecap="round" />
        
        {/* Tiny Pink Nose */}
        <polygon points="50,65 48,63 52,63" fill="#F472B6" />
        
        {/* Rosy Cheeks */}
        <circle cx="34" cy="64" r="3.5" fill="#F472B6" opacity="0.4" />
        <circle cx="66" cy="64" r="3.5" fill="#F472B6" opacity="0.4" />
        
        {/* Golden Crescent Moon above */}
        <path d="M50 20 C46 20 44 24 45 28 C41 26 43 21 47 18 C48 17 50 17 50 20 Z" fill="#FBBF24" />
        <circle cx="68" cy="34" r="1.5" fill="#FEF08A" />
      </svg>
    ),
  },

  // 8. Miso Shiba (Loyal Focus)
  {
    id: 'shiba-miso',
    name: 'Miso Shiba',
    subtitle: 'Loyal Habit Keeper',
    bg: '#FED7AA',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="48" fill="#FED7AA" />
        
        {/* Triangular Shiba Ears */}
        <polygon points="26,46 34,22 48,38" fill="#D97706" />
        <polygon points="30,42 36,28 44,38" fill="#FDE68A" />
        
        <polygon points="74,46 66,22 52,38" fill="#D97706" />
        <polygon points="70,42 64,28 56,38" fill="#FDE68A" />
        
        {/* Head */}
        <circle cx="50" cy="56" r="26" fill="#D97706" />
        
        {/* Cream Cheeks and Muzzle */}
        <path d="M28 62 Q36 78 50 78 Q64 78 72 62 Q66 52 50 56 Q34 52 28 62 Z" fill="#FFFDF9" />
        
        {/* Maro Eyebrow Dots */}
        <circle cx="40" cy="46" r="2.5" fill="#FFFDF9" />
        <circle cx="60" cy="46" r="2.5" fill="#FFFDF9" />
        
        {/* Cheerful Puppy Eyes */}
        <ellipse cx="40" cy="53" rx="3.5" ry="4" fill="#24201D" />
        <circle cx="39" cy="51.5" r="1.2" fill="#FFFFFF" />
        
        <ellipse cx="60" cy="53" rx="3.5" ry="4" fill="#24201D" />
        <circle cx="59" cy="51.5" r="1.2" fill="#FFFFFF" />
        
        {/* Button Nose & Smile */}
        <ellipse cx="50" cy="62" rx="3.5" ry="2.5" fill="#24201D" />
        <path d="M46 66 Q50 69 54 66" stroke="#24201D" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Rosy Cheeks */}
        <circle cx="34" cy="63" r="3.5" fill="#FDA4AF" opacity="0.6" />
        <circle cx="66" cy="63" r="3.5" fill="#FDA4AF" opacity="0.6" />
        
        {/* Green Bandana Collar */}
        <path d="M34 76 Q50 86 66 76 Q50 82 34 76 Z" fill="#2D6A4F" />
      </svg>
    ),
  },
];

export function getAvatarById(id?: string): AvatarOption {
  if (!id) return AVATAR_OPTIONS[0];
  const found = AVATAR_OPTIONS.find((a) => a.id === id);
  if (found) return found;

  // Compatibility aliases for legacy IDs
  if (id === 'bunny-scout') return AVATAR_OPTIONS[0]; // Sumire Kitsune
  if (id === 'smug-goblin') return AVATAR_OPTIONS[1]; // Kuro Neko
  if (id === 'zen-capybara') return AVATAR_OPTIONS[2]; // Zen Capy
  if (id === 'cozy-hoodie') return AVATAR_OPTIONS[3];  // Mochi Panda
  if (id === 'turbo-dev') return AVATAR_OPTIONS[4];    // Komorebi Sprout
  if (id === 'cool-hacker') return AVATAR_OPTIONS[5];  // Tori Dawn
  if (id === 'panic-screaming') return AVATAR_OPTIONS[6]; // Tsuki Moon
  if (id === 'ninja-stealth') return AVATAR_OPTIONS[7]; // Miso Shiba

  return AVATAR_OPTIONS[0];
}
