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
    milk: 'bg-white border-[#24201D] shadow-[2.5px_2.5px_0px_#24201D]',
    lavender: 'bg-[#F4EFEA] border-[#24201D] shadow-[2.5px_2.5px_0px_#24201D]', // Washi paper soft surface
    lime: 'bg-[#EEF5F0] border-[#24201D] shadow-[2.5px_2.5px_0px_#24201D]',     // Soft Matcha leaf
    peach: 'bg-[#FAF0EC] border-[#24201D] shadow-[2.5px_2.5px_0px_#24201D]',    // Baked Terracotta tint
    yellow: 'bg-[#FCF7ED] border-[#24201D] shadow-[2.5px_2.5px_0px_#24201D]',   // Golden Ochre tint
    sky: 'bg-[#EFF5F9] border-[#24201D] shadow-[2.5px_2.5px_0px_#24201D]',      // Aizome Indigo tint
  };

  return (
    <div
      className={twMerge(
        clsx(
          'border-[1.75px] rounded-3xl p-5 transition-all duration-150',
          variantStyles[variant],
          hoverEffect && 'hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#24201D]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
