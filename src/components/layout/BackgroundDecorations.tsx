import React from 'react';

export const BackgroundDecorations: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Subtle Architectural Washi Grid (Light & Dark) */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Soft Japanese Ambient Corner Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3D6B52]/10 dark:bg-[#4E8A68]/15 rounded-full blur-3xl pointer-events-none transition-colors duration-500" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#E09F3E]/10 dark:bg-[#E5A84B]/10 rounded-full blur-3xl pointer-events-none transition-colors duration-500" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#C25E40]/8 dark:bg-[#D97354]/10 rounded-full blur-3xl pointer-events-none transition-colors duration-500" />
    </div>
  );
};
