const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  bull: '•',
  copy: '©',
  gt: '>',
  hellip: '…',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  middot: '·',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  rdquo: '”',
  reg: '®',
  rsquo: '’',
  trade: '™'
};

function decodeEntitiesOnce(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const code = parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10);
      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        return String.fromCodePoint(code);
      }
      return match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Decode HTML entities repeatedly. Job-board APIs sometimes return content that
 * is encoded twice (&amp;lt;p&amp;gt;), which used to turn into visible HTML
 * after a single decode.
 */
function decodeEntities(input: string): string {
  let text = input;
  for (let pass = 0; pass < 3; pass++) {
    const next = decodeEntitiesOnce(text);
    if (next === text) break;
    text = next;
  }
  return text;
}

/**
 * Convert an HTML job description into readable plain text.
 *
 * Board APIs are inconsistent: some send real tags, some send escaped tags and
 * some double-encode the whole document. This normalizes all three, keeps
 * paragraph/list structure, removes scripts and control characters, and
 * optionally caps the result at the same length stored in Postgres.
 */
export function htmlToText(input: string | null | undefined, maxLength = 0): string {
  if (!input) return '';

  let text = decodeEntities(String(input));

  // Remove non-content elements entirely.
  text = text.replace(
    /<(script|style|noscript|template|iframe|svg|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ' '
  );

  // Keep block boundaries before tags are removed.
  text = text.replace(/<\s*br\s*\/?>/gi, '\n');
  text = text.replace(/<\s*hr\s*\/?>/gi, '\n');
  text = text.replace(/<\s*li\b[^>]*>/gi, '\n• ');
  text = text.replace(
    /<\s*\/\s*(p|div|li|ul|ol|h[1-6]|tr|section|article|header|footer|blockquote|table)\s*>/gi,
    '\n'
  );
  text = text.replace(
    /<\s*(p|div|h[1-6]|tr|section|article|header|footer|blockquote|table)\b[^>]*>/gi,
    '\n'
  );

  // Remove actual tags, then decode entities that were hiding nested markup and
  // strip the tags that were just exposed.
  text = text.replace(/<[^>]*>/g, ' ');
  text = decodeEntities(text);
  text = text.replace(/<[^>]*>/g, ' ');

  text = text
    .replace(/\u00a0/g, ' ')
    // eslint-disable-next-line no-control-regex -- deliberately strip control bytes
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, '');

  let result = text
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();

  if (maxLength > 0 && result.length > maxLength) {
    result = result.slice(0, maxLength).trim();
  }

  return result;
}
