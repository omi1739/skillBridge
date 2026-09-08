const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

export function safeExternalUrl(value: string | undefined | null): string {
  if (!value) return '';
  if (value.length > 2000) return '';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return '';
  }
  return ALLOWED_SCHEMES.has(url.protocol) ? url.href : '';
}