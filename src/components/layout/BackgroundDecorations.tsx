import React from 'react';

export const BackgroundDecorations: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* 1. Subtle Ambient Neo-Color Glows (Backlighting for cards) */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-[#C084FC]/15 blur-3xl" />
      <div className="absolute top-10 right-0 w-80 h-80 rounded-full bg-[#FFDE59]/20 blur-3xl" />
      <div className="absolute bottom-10 left-0 w-88 h-88 rounded-full bg-[#BEF264]/18 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#FF844B]/15 blur-3xl" />

      {/* 2. Retro Graph Paper Grid (Architectural Blueprint lines) */}
      <div
        className="absolute inset-0 opacity-[0.065]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000000 1.2px, transparent 1.2px),
            linear-gradient(to bottom, #000000 1.2px, transparent 1.2px)
          `,
          backgroundSize: '28px 28px',
        }}
      />

      {/* 3. Authentic Neo-Brutalist Chunky Geometric Graphic Elements */}

      {/* Top Left: Chunky 4-Point Burst Star ✦ with Offset Shadow */}
      <div className="absolute top-12 left-6 opacity-85 animate-neo-float">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          {/* Shadow */}
          <path
            d="M18 2L20.8 13.2L32 16L20.8 18.8L18 30L15.2 18.8L4 16L15.2 13.2L18 2Z"
            fill="#000000"
            transform="translate(3, 3)"
          />
          {/* Main Shape */}
          <path
            d="M18 2L20.8 13.2L32 16L20.8 18.8L18 30L15.2 18.8L4 16L15.2 13.2L18 2Z"
            fill="#FFDE59"
            stroke="#000000"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Top Right: 3D Isometric Wireframe Cube with Bold Black Lines */}
      <div className="absolute top-16 right-6 opacity-75 rotate-12">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          {/* Top Face */}
          <path
            d="M22 4L38 13L22 22L6 13L22 4Z"
            fill="#C084FC"
            stroke="#000000"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Left Face */}
          <path
            d="M6 13L22 22V40L6 31V13Z"
            fill="#E9D5FF"
            stroke="#000000"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Right Face */}
          <path
            d="M22 22L38 13V31L22 40V22Z"
            fill="#FAF6EE"
            stroke="#000000"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Mid Left: Bold Geometric Plus Cross ⨁ with Drop Shadow */}
      <div className="absolute top-1/3 left-5 opacity-80 rotate-[-10deg]">
        <div className="w-8 h-8 rounded-xl bg-[#BEF264] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000000]">
          <span className="font-black text-black text-sm leading-none">+</span>
        </div>
      </div>

      {/* Mid Right: Chunky Offset Pill Stamp */}
      <div className="absolute top-2/5 right-5 opacity-85 rotate-12">
        <div className="px-3 py-1 rounded-full bg-[#FF844B] border-2 border-black flex items-center justify-center shadow-[2.5px_2.5px_0px_#000000]">
          <span className="w-2.5 h-2.5 rounded-full bg-white border border-black inline-block mr-1.5" />
          <span className="font-black text-black text-[10px] tracking-wider uppercase font-mono">
            NEO
          </span>
        </div>
      </div>

      {/* Bottom Left: Bold Wavy Zigzag Ribbon 〰️ */}
      <div className="absolute bottom-28 left-6 opacity-80 rotate-12">
        <svg width="52" height="28" viewBox="0 0 52 28" fill="none">
          <path
            d="M2 14C8 4 16 4 22 14C28 24 36 24 42 14C46 7 50 9 50 9"
            stroke="#000000"
            strokeWidth="2.75"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Bottom Right: Chunky Double Circle Target */}
      <div className="absolute bottom-24 right-8 opacity-80 rotate-[-8deg]">
        <div className="w-9 h-9 rounded-full bg-[#38BDF8] border-2 border-black flex items-center justify-center shadow-[2.5px_2.5px_0px_#000000]">
          <div className="w-4 h-4 rounded-full bg-white border-2 border-black" />
        </div>
      </div>

    </div>
  );
};
