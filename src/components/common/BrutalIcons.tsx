import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

// 1. Illustrated Artist Palette (Themes / Today / Design) - Exact Reference Match #1
export const DoodlePalette: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C13.66 22 15 20.66 15 19C15 18.23 14.69 17.53 14.19 17.02C13.69 16.51 13.38 15.82 13.38 15.05C13.38 13.4 14.72 12.06 16.37 12.06H18.5C20.43 12.06 22 10.49 22 8.56C22 4.93 17.52 2 12 2Z"
      fill="white"
      stroke="#18181B"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <ellipse cx="17.5" cy="8.5" rx="1.5" ry="1.5" fill="#18181B" />
    <circle cx="6.5" cy="11.5" r="1.5" fill="#C084FC" stroke="#18181B" strokeWidth="1.25" />
    <circle cx="9.5" cy="7" r="1.5" fill="#FEF08A" stroke="#18181B" strokeWidth="1.25" />
    <circle cx="14.5" cy="6" r="1.5" fill="#FED7AA" stroke="#18181B" strokeWidth="1.25" />
    <circle cx="8" cy="16" r="1.5" fill="#BEF264" stroke="#18181B" strokeWidth="1.25" />
  </svg>
);

// 2. Stacked 3D Documents Doodle (Backlog / Posts) - Exact Reference Match #2
export const DoodleDocs: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect
      x="8"
      y="2"
      width="13"
      height="16"
      rx="2"
      fill="#F5EEFF"
      stroke="#18181B"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <rect
      x="5"
      y="4.5"
      width="13"
      height="16"
      rx="2"
      fill="#FAF7F2"
      stroke="#18181B"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <rect
      x="2"
      y="7"
      width="13"
      height="15"
      rx="2"
      fill="white"
      stroke="#18181B"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="5.5" y1="11" x2="11.5" y2="11" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
    <line x1="5.5" y1="14.5" x2="11.5" y2="14.5" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
    <line x1="5.5" y1="18" x2="9.5" y2="18" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 3. Interlocking Chain Link Doodle (Habits / Links / Streaks) - Exact Reference Match #3
export const DoodleChain: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect
      x="3.5"
      y="6.5"
      width="10"
      height="10"
      rx="5"
      transform="rotate(-45 3.5 6.5)"
      fill="white"
      stroke="#18181B"
      strokeWidth="2.25"
    />
    <rect
      x="9"
      y="12"
      width="10"
      height="10"
      rx="5"
      transform="rotate(-45 9 12)"
      fill="white"
      stroke="#18181B"
      strokeWidth="2.25"
    />
    <line
      x1="8.5"
      y1="15.5"
      x2="15.5"
      y2="8.5"
      stroke="#18181B"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

// 4. Isometric 3D Bar Chart Book (Stats / Momentum) - Exact Reference Match #4
export const DoodleStatsBook: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M3 19.5L6.5 4.5H20.5L17.5 20.5L3 19.5Z"
      fill="white"
      stroke="#18181B"
      strokeWidth="2.25"
      strokeLinejoin="round"
    />
    <path d="M3 19.5L5 22L19.5 22L17.5 20.5" fill="#FAF7F2" stroke="#18181B" strokeWidth="2" strokeLinejoin="round" />
    <rect x="7" y="13" width="2.5" height="5" rx="0.5" fill="#18181B" />
    <rect x="11" y="9.5" width="2.5" height="8.5" rx="0.5" fill="#18181B" />
    <rect x="15" y="6.5" width="2.5" height="11.5" rx="0.5" fill="#18181B" />
  </svg>
);

// 5. Flower-Petal Gear Badge (Settings / Stats) - Exact Reference Match #5
export const DoodleFlowerGear: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M12 2C13.2 2 14.1 3.2 15.2 3.8C16.3 4.4 17.7 4.2 18.7 5.1C19.7 6 19.6 7.4 20.2 8.5C20.8 9.6 22 10.5 22 11.7C22 12.9 20.8 13.8 20.2 14.9C19.6 16 19.7 17.4 18.7 18.3C17.7 19.2 16.3 19 15.2 19.6C14.1 20.2 13.2 21.4 12 21.4C10.8 21.4 9.9 20.2 8.8 19.6C7.7 19 6.3 19.2 5.3 18.3C4.3 17.4 4.4 16 3.8 14.9C3.2 13.8 2 12.9 2 11.7C2 10.5 3.2 9.6 3.8 8.5C4.4 7.4 4.3 6 5.3 5.1C6.3 4.2 7.7 4.4 8.8 3.8C9.9 3.2 10.8 2 12 2Z"
      fill="#FCE7F3"
      stroke="#18181B"
      strokeWidth="2.25"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="11.7" r="3.75" fill="white" stroke="#18181B" strokeWidth="2.25" />
    <circle cx="12" cy="11.7" r="1.25" fill="#18181B" />
  </svg>
);

// 6. Dual-Tone 3D Fire Flame (Streaks / Energy)
export const DoodleFlame3D: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M12 2C12 2 16.5 6.5 16.5 12C16.5 16.5 14 21 12 21C10 21 7.5 16.5 7.5 12C7.5 7.5 12 2 12 2Z"
      fill="#FED7AA"
      stroke="#18181B"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 22C16.97 22 21 17.97 21 13C21 8.5 18 5 18 5C18 5 17 8 15 9.5C13 11 15 13 15 13C15 13 13 11.5 11 11.5C9 11.5 7.5 13 7.5 15C7.5 17 8.5 18.5 8.5 18.5C8.5 18.5 6 17 6 13C6 9.5 8.5 6.5 8.5 6.5C8.5 6.5 3 10 3 15C3 18.866 7.03 22 12 22Z"
      fill="#FB923C"
      stroke="#18181B"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 21C14 21 15 18.5 15 16C15 13.5 13.5 12 12 12C10.5 12 9 13.5 9 16C9 18.5 10 21 12 21Z"
      fill="#FEF08A"
      stroke="#18181B"
      strokeWidth="1.75"
    />
  </svg>
);

// 7. 3D Stopwatch / Timer Plunger Doodle (Focus / Pomodoro)
export const DoodleStopwatch: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect x="10" y="1" width="4" height="3" rx="1" fill="#18181B" />
    <path d="M12 4V6" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="18" y1="4.5" x2="20.5" y2="7" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="14" r="8.5" fill="white" stroke="#18181B" strokeWidth="2.25" />
    <circle cx="12" cy="14" r="6.5" fill="#E9D5FF" fillOpacity="0.4" />
    <circle cx="12" cy="14" r="1.5" fill="#18181B" />
    <line x1="12" y1="14" x2="12" y2="9.5" stroke="#18181B" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="12" y1="14" x2="15.5" y2="14" stroke="#18181B" strokeWidth="2.25" strokeLinecap="round" />
  </svg>
);

// 8. 3D Golden Crown / Boss Quest
export const DoodleCrown: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M3 18L5 7L9.5 12L12 5L14.5 12L19 7L21 18H3Z"
      fill="#FEF08A"
      stroke="#18181B"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="3" y="18" width="18" height="3" rx="1.5" fill="#F59E0B" stroke="#18181B" strokeWidth="2.25" />
    <circle cx="5" cy="6" r="1.5" fill="#C084FC" stroke="#18181B" strokeWidth="1.25" />
    <circle cx="12" cy="4" r="1.5" fill="#BEF264" stroke="#18181B" strokeWidth="1.25" />
    <circle cx="19" cy="6" r="1.5" fill="#FB7185" stroke="#18181B" strokeWidth="1.25" />
  </svg>
);

// 9. Hand-drawn Bold Checkmark
export const DoodleCheckBadge: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <polyline points="20 6 9 17 4 12" stroke="#18181B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 10. Illustrated Target Doodle
export const DoodleTarget: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9.5" fill="white" stroke="#18181B" strokeWidth="2.25" />
    <circle cx="12" cy="12" r="6" fill="#F3E8FF" stroke="#18181B" strokeWidth="1.75" />
    <circle cx="12" cy="12" r="2.5" fill="#C084FC" stroke="#18181B" strokeWidth="1.5" />
  </svg>
);

// Aliases for compatibility
export const DoodleFlame = DoodleFlame3D;
export const DoodleGear = DoodleFlowerGear;
export const DoodleChart = DoodleStatsBook;
export const DoodleCheck = DoodleCheckBadge;
