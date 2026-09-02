import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BrutalBadgeProps {
  variant?: 'lavender' | 'lime' | 'peach' | 'sky' | 'yellow' | 'rose' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
}

export const BrutalBadge: React.FC<BrutalBadgeProps> = ({
  variant = 'lavender',
  size = 'sm',
  className,
  children,
}) => {
  const variantStyles = {
    lavender: 'bg-[#E8EFE9] text-[#24201D] border-[#24201D]', // Washi Sage
    lime: 'bg-[#DDE8DE] text-[#24201D] border-[#24201D]',     // Matcha Leaf
    peach: 'bg-[#F7E3DC] text-[#24201D] border-[#24201D]',    // Baked Terracotta
    sky: 'bg-[#DEE8EF] text-[#24201D] border-[#24201D]',      // Aizome Indigo
    yellow: 'bg-[#FBECCF] text-[#24201D] border-[#24201D]',   // Golden Ochre
    rose: 'bg-[#F9E2E5] text-[#24201D] border-[#24201D]',     // Soft Plum
    slate: 'bg-white text-[#24201D] border-[#24201D]',        // Pure Cotton
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2.5 py-0.5 font-black uppercase tracking-wider rounded-full',
    md: 'text-xs px-3.5 py-1 font-black uppercase tracking-wider rounded-full',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 border-[1.25px] shadow-[1px_1px_0px_#24201D] select-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
