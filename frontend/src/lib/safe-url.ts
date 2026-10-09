const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:']);
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Normalises a user- or seed-supplied URL for use in an `href`, refusing any
 * scheme other than http(s)/mailto (so a stored `javascript:` payload can
 * never be emitted into the DOM).
 *
 * Scheme-less values such as `github.com/you` are treated as https: they are
 * what people actually type into the profile form, and rejecting them left an
 * `href=""` that navigated nowhere.
 */
export function safeExternalUrl(value: string | undefined | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return '';

  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return '';
  }
  return ALLOWED_SCHEMES.has(url.protocol) ? url.href : '';
}
