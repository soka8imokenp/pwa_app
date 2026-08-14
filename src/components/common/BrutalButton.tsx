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
    primary: 'bg-[#C084FC] text-[#18181B] hover:bg-[#B366FA] border-[#18181B]',
    secondary: 'bg-white text-[#18181B] hover:bg-[#F3E8FF] border-[#18181B]',
    lime: 'bg-[#BEF264] text-[#18181B] hover:bg-[#A3E635] border-[#18181B]',
    peach: 'bg-[#FED7AA] text-[#18181B] hover:bg-[#FDBA74] border-[#18181B]',
    danger: 'bg-[#FECDD3] text-[#18181B] hover:bg-[#FDA4AF] border-[#18181B]',
    ghost: 'bg-transparent border-transparent shadow-none hover:bg-purple-100/50',
    outline: 'bg-transparent text-[#18181B] border-[#18181B] hover:bg-white',
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
