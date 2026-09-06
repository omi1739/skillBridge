'use client';

import { VerificationStatus } from '@skillbridge/types';
import { VERIFICATION_BADGES } from '@/lib/constants';

export function VerificationBadge({ status }: { status?: VerificationStatus }) {
  const s = status || 'UNVERIFIED';
  const badge = VERIFICATION_BADGES[s];
  return (
    <span className="badge-chip" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
      <span className="badge-chip-dot" style={{ background: badge.color }} />
      {badge.label}
    </span>
  );
}

export function RemoteBadge({ isRemote, location }: { isRemote?: boolean; location?: string }) {
  const remote = !!isRemote;
  const loc = remote ? (location && !/remote|work from home|wfh/i.test(location) ? location : 'Work from Home') : (location || 'Onsite');
  return (
    <span className="badge-chip" style={{
      background: remote ? 'var(--success-bg)' : 'var(--bg-raise)',
      color: remote ? 'var(--accent-text)' : 'var(--text-secondary)',
      border: remote ? '1px solid var(--success-border)' : '1px solid var(--border-color)'
    }}>
      <span className="badge-chip-dot" style={{ background: remote ? 'var(--teal)' : 'var(--text-muted)' }} />
      {remote ? 'Remote · WFH' : loc}
    </span>
  );
}