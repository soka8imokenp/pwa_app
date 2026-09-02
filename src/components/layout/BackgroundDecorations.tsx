import React from 'react';

export const BackgroundDecorations: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Clean Architectural Washi Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Elegant Kyoto Matcha Atmospheric Glow (Clean & Subtle, Zero Muddy Blobs) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3D6B52]/10 dark:bg-[#348B5C]/8 rounded-full blur-3xl pointer-events-none transition-colors duration-500" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#3D6B52]/6 dark:bg-[#348B5C]/5 rounded-full blur-3xl pointer-events-none transition-colors duration-500" />
    </div>
  );
};
