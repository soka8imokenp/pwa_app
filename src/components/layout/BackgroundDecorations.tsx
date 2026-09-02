import React from 'react';

export const BackgroundDecorations: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Subtle Architectural Washi Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #24201D 1px, transparent 1px),
            linear-gradient(to bottom, #24201D 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Soft Japanese Ambient Corner Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3D6B52]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#E09F3E]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#C25E40]/8 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
