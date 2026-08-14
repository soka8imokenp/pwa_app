import React, { useEffect, useRef } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';

interface LottiePlayerProps {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

export const LottiePlayer: React.FC<LottiePlayerProps> = ({
  animationData,
  loop = true,
  autoplay = true,
  className = 'w-full h-full',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current || !animationData) return;

    if (animRef.current) {
      animRef.current.destroy();
      animRef.current = null;
    }

    try {
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop,
        autoplay,
        animationData,
      });
    } catch (e) {
      console.warn('Lottie failed to load', e);
    }

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [animationData, loop, autoplay]);

  return <div ref={containerRef} className={className} />;
};
