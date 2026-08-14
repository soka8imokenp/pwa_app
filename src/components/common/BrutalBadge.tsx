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
    lavender: 'bg-[#F3E8FF] text-[#18181B] border-[#18181B]',
    lime: 'bg-[#ECFCCB] text-[#18181B] border-[#18181B]',
    peach: 'bg-[#FFEDD5] text-[#18181B] border-[#18181B]',
    sky: 'bg-[#E0F2FE] text-[#18181B] border-[#18181B]',
    yellow: 'bg-[#FEF08A] text-[#18181B] border-[#18181B]',
    rose: 'bg-[#FFE4E6] text-[#18181B] border-[#18181B]',
    slate: 'bg-white text-[#18181B] border-[#18181B]',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2.5 py-0.5 font-black uppercase tracking-wider rounded-full',
    md: 'text-xs px-3.5 py-1 font-black uppercase tracking-wider rounded-full',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 border-[1.25px] shadow-[1px_1px_0px_#18181B] select-none',
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
