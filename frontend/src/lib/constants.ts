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
  EMPLOYER_VERIFIED: { label: 'Employer Verified', color: 'var(--verify-employer)', bg: 'var(--verify-employer-bg)', border: 'var(--verify-employer-border)' },
  SOURCE_VERIFIED:   { label: 'Source Verified',   color: 'var(--verify-source)', bg: 'var(--verify-source-bg)', border: 'var(--verify-source-border)' },
  RECENTLY_CHECKED:  { label: 'Recently Checked',  color: 'var(--verify-recent)', bg: 'var(--verify-recent-bg)', border: 'var(--verify-recent-border)' },
  EXTERNAL_SOURCE:   { label: 'External Source',   color: 'var(--verify-external)', bg: 'var(--verify-external-bg)', border: 'var(--verify-external-border)' },
  EXPIRED:           { label: 'Expired',           color: 'var(--verify-expired)', bg: 'var(--verify-expired-bg)', border: 'var(--verify-expired-border)' },
  UNVERIFIED:        { label: 'Unverified',        color: 'var(--verify-unverified)', bg: 'var(--verify-unverified-bg)', border: 'var(--verify-unverified-border)' },
};