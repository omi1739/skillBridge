'use client';

import React from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  email?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Avatar({ src, name, email, size = 32, className, style }: AvatarProps) {
  const initials = () => {
    const label = name || email || '?';
    return label.substring(0, 2).toUpperCase();
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Profile'}
        width={size}
        height={size}
        style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0, ...style }}
        className={className}
        referrerPolicy="no-referrer"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: 'linear-gradient(135deg, var(--teal), var(--cyan))',
        color: '#06201c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
        ...style
      }}
    >
      {initials()}
    </span>
  );
}