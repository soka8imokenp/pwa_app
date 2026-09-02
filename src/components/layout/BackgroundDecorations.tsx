import React from 'react';

export const BackgroundDecorations: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Soft Japanese Warm Ambient Washi Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3D6B52]/7 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#E09F3E]/7 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#C25E40]/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
