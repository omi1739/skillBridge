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
      background: remote ? 'rgba(45, 212, 191, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      color: remote ? '#5eead4' : 'var(--text-secondary)',
      border: remote ? '1px solid rgba(45, 212, 191, 0.25)' : '1px solid var(--border-color)'
    }}>
      <span className="badge-chip-dot" style={{ background: remote ? '#2dd4bf' : 'var(--text-muted)' }} />
      {remote ? 'Remote · WFH' : loc}
    </span>
  );
}