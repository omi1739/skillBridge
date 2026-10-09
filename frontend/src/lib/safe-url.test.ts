import { describe, it, expect } from 'vitest';
import { safeExternalUrl } from './safe-url';

describe('safeExternalUrl', () => {
  it('keeps http, https and mailto URLs', () => {
    expect(safeExternalUrl('https://github.com/user/repo')).toBe('https://github.com/user/repo');
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com/');
    expect(safeExternalUrl('mailto:hi@example.com')).toBe('mailto:hi@example.com');
  });

  it('assumes https for scheme-less values people actually type', () => {
    expect(safeExternalUrl('github.com/user')).toBe('https://github.com/user');
    expect(safeExternalUrl('  portfolio.dev  ')).toBe('https://portfolio.dev/');
  });

  it('refuses dangerous or non-web schemes', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBe('');
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(safeExternalUrl('file:///etc/passwd')).toBe('');
  });

  it('returns empty for missing, blank, or oversized input', () => {
    expect(safeExternalUrl(undefined)).toBe('');
    expect(safeExternalUrl(null)).toBe('');
    expect(safeExternalUrl('   ')).toBe('');
    expect(safeExternalUrl('https://example.com/' + 'a'.repeat(2100))).toBe('');
  });
});
