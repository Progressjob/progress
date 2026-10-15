import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 4,
  className = '',
}) => {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`reactbits-shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(120deg, rgba(11, 87, 208, 0.95) 0%, rgba(11, 87, 208, 0.95) 35%, rgba(255, 255, 255, 0.95) 50%, rgba(11, 87, 208, 0.95) 65%, rgba(11, 87, 208, 0.95) 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: disabled ? 'inherit' : 'transparent',
        display: 'inline-block',
        animation: disabled ? 'none' : `shine ${animationDuration} linear infinite`,
      }}
    >
      {text}
    </span>
  );
};
