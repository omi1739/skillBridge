import { VerificationStatus } from '@skillbridge/types';

export const CURRENT_STATUS_OPTIONS = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'JOB_HOLDER', label: 'Job Holder / Employed' },
  { value: 'JOB_SEEKER', label: 'Job Seeker' },
  { value: 'OTHER', label: 'Other' }
] as const;

export const AUTH_INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: '7px',
  color: 'var(--text-primary)',
  fontSize: '0.85rem'
};

export const AUTH_LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  fontWeight: 500,
  marginBottom: '0.35rem'
};

export const VERIFICATION_BADGES: Record<VerificationStatus, { label: string; color: string; bg: string; border: string }> = {
  EMPLOYER_VERIFIED: { label: 'Employer Verified', color: '#34d399', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' },
  SOURCE_VERIFIED:   { label: 'Source Verified',   color: '#5eead4', bg: 'rgba(45, 212, 191, 0.1)', border: 'rgba(45, 212, 191, 0.25)' },
  RECENTLY_CHECKED:  { label: 'Recently Checked',  color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.25)' },
  EXTERNAL_SOURCE:   { label: 'External Source',   color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)', border: 'rgba(167, 139, 250, 0.25)' },
  EXPIRED:           { label: 'Expired',           color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.25)' },
  UNVERIFIED:        { label: 'Unverified',        color: '#94a3b8', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.08)' },
};