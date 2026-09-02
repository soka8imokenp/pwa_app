import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { playClickSound } from '../../lib/sound';

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'lime' | 'peach' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  sound?: boolean;
}

export const BrutalButton: React.FC<BrutalButtonProps> = ({
  variant = 'primary',
  size = 'md',
  sound = true,
  className,
  children,
  onClick,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-[#3D6B52] text-white hover:bg-[#345B45] border-[#24201D] shadow-[2px_2px_0px_#24201D]',
    secondary: 'bg-white text-[#24201D] hover:bg-[#F4F0EA] border-[#24201D] shadow-[2px_2px_0px_#24201D]',
    lime: 'bg-[#DDE8DE] text-[#24201D] hover:bg-[#C9DCCB] border-[#24201D] shadow-[2px_2px_0px_#24201D]',
    peach: 'bg-[#C25E40] text-white hover:bg-[#AC5035] border-[#24201D] shadow-[2px_2px_0px_#24201D]',
    danger: 'bg-[#F9E2E5] text-[#8C2B39] hover:bg-[#F4CCD1] border-[#24201D] shadow-[2px_2px_0px_#24201D]',
    ghost: 'bg-transparent border-transparent shadow-none hover:bg-[#3D6B52]/10',
    outline: 'bg-transparent text-[#24201D] border-[#24201D] hover:bg-white shadow-[1.5px_1.5px_0px_#24201D]',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-xl font-bold',
    md: 'px-4.5 py-2.5 text-sm rounded-2xl font-black',
    lg: 'px-6 py-3.5 text-base rounded-2xl font-black',
    icon: 'p-2 rounded-xl aspect-square',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (sound) {
      playClickSound();
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={twMerge(
        clsx(
          'soft-btn',
          variantStyles[variant],
          sizeStyles[size],
          props.disabled && 'opacity-50 cursor-not-allowed pointer-events-none transform-none shadow-none',
          className
        )
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};
