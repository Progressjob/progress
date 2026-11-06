import React from 'react';

interface ProgressLogoProps {
  variant?: 'blue' | 'white' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const ProgressLogo: React.FC<ProgressLogoProps> = ({
  variant = 'blue',
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 56 : 42;
  const titleSize = size === 'sm' ? '1.1rem' : size === 'lg' ? '1.65rem' : '1.35rem';
  const subtitleSize = size === 'sm' ? '0.62rem' : size === 'lg' ? '0.78rem' : '0.68rem';

  const textColor = variant === 'white' ? '#FFFFFF' : variant === 'dark' ? '#0F172A' : '#0A2540';
  const subtitleColor = variant === 'white' ? 'rgba(255, 255, 255, 0.75)' : '#4B5563';

  return (
    <div
      className={`progress-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '0.55rem' : '0.75rem',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      {/* Recreated Circular Emblem from Brochure */}
      <img
        src="/images/progress-jobs-logo.png"
        width={iconSize}
        height={iconSize}
        alt=""
        style={{ flexShrink: 0, borderRadius: '50%', objectFit: 'contain' }}
      />

      {/* Brand Typography */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span
          style={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: titleSize,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: textColor,
            textTransform: 'uppercase',
          }}
        >
          Progress Jobs
        </span>
        {showSubtitle && (
          <span
            className="logo-subtitle"
            style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: subtitleSize,
              fontWeight: 500,
              letterSpacing: '0.04em',
              color: subtitleColor,
              textTransform: 'lowercase',
              marginTop: '2px',
            }}
          >
            manpower supply & training PLC
          </span>
        )}
      </div>
    </div>
  );
};
