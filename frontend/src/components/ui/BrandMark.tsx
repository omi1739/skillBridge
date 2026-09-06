import React from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export default function BrandMark({ size = 28, className = 'brand-mark' }: BrandMarkProps) {
  return (
    <span
      className={className}
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        fill="none"
        aria-hidden="true"
      >
        <rect x="7.5" y="7" width="2.8" height="18" rx="1.4" fill="currentColor" />
        <rect x="21.7" y="7" width="2.8" height="18" rx="1.4" fill="currentColor" />
        <path d="M9.2 15.4C13.1 12.2 18.9 12.2 22.8 15.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}