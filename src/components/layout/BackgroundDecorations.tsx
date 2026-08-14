import React from 'react';

export const BackgroundDecorations: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Subtle Architectural Grid */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000000 1px, transparent 1px),
            linear-gradient(to bottom, #000000 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Soft Ambient Corner Glows for Depth (Non-distracting) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#FFE873]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#E8DCFF]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#D1FBE4]/20 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
