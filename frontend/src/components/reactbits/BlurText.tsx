import React, { useEffect, useState } from 'react';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
}

export const BlurText: React.FC<BlurTextProps> = ({
  text,
  delay = 70,
  className = '',
  animateBy = 'words',
  direction = 'top',
}) => {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    // Trigger animation immediately on mount
    const timer = setTimeout(() => {
      setInView(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const elements = animateBy === 'words' ? text.split(' ') : text.split('');

  return (
    <span className={`reactbits-blur-text ${className}`} style={{ display: 'inline-block' }}>
      {elements.map((segment, index) => {
        const translateY = inView ? '0px' : direction === 'top' ? '-18px' : '18px';
        const opacity = inView ? 1 : 0;
        const filter = inView ? 'blur(0px)' : 'blur(8px)';
        const transitionDelay = `${index * delay}ms`;

        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              transition: `all 0.55s cubic-bezier(0.2, 0.65, 0.3, 0.9)`,
              transitionDelay,
              transform: `translateY(${translateY})`,
              opacity,
              filter,
              willChange: 'transform, opacity, filter',
            }}
          >
            {segment}
            {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
          </span>
        );
      })}
    </span>
  );
};
