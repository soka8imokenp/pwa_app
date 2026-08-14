import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BrutalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'milk' | 'lavender' | 'lime' | 'peach' | 'yellow' | 'sky';
  hoverEffect?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const BrutalCard: React.FC<BrutalCardProps> = ({
  variant = 'milk',
  hoverEffect = false,
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    milk: 'bg-white border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B]',
    lavender: 'bg-[#F6EFFF] border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B]',
    lime: 'bg-[#F2FCE2] border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B]',
    peach: 'bg-[#FFF1E5] border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B]',
    yellow: 'bg-[#FEFCE8] border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B]',
    sky: 'bg-[#F0F9FF] border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B]',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'border-[1.5px] rounded-3xl p-5 transition-all duration-150',
          variantStyles[variant],
          hoverEffect && 'hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#18181B]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
