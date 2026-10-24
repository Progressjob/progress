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

  const primaryColor = variant === 'white' ? '#FFFFFF' : '#0B57D0';
  const secondaryColor = variant === 'white' ? 'rgba(255, 255, 255, 0.82)' : '#1E40AF';
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
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={`grad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <filter id={`shadow-${variant}`} x1="-10%" y1="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Outer Circular Rim */}
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke={`url(#grad-${variant})`}
          strokeWidth="3.5"
          fill={variant === 'white' ? 'rgba(255,255,255,0.08)' : '#F0F6FF'}
          filter={`url(#shadow-${variant})`}
        />

        {/* Outer Swirling Progress Arrow */}
        <path
          d="M 24 64 A 32 32 0 1 1 76 56"
          stroke={`url(#grad-${variant})`}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Arrow Head */}
        <path
          d="M 68 53 L 80 50 L 80 62 Z"
          fill={`url(#grad-${variant})`}
          strokeLinejoin="round"
        />

        {/* Inner Ascending Growth Bar Chart */}
        <rect x="35" y="58" width="5.5" height="12" rx="2" fill={`url(#grad-${variant})`} />
        <rect x="43" y="52" width="5.5" height="18" rx="2" fill={`url(#grad-${variant})`} />
        <rect x="51" y="44" width="5.5" height="26" rx="2" fill={`url(#grad-${variant})`} />
        <rect x="59" y="36" width="5.5" height="34" rx="2" fill={`url(#grad-${variant})`} />
      </svg>

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
          Progress
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
