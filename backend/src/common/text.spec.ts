import { htmlToText } from './text';

describe('htmlToText', () => {
  it('strips ordinary HTML tags', () => {
    expect(htmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('decodes escaped HTML before stripping it', () => {
    expect(
      htmlToText('&lt;div&gt;&lt;p&gt;Hello&amp;nbsp;world&lt;/p&gt;&lt;/div&gt;')
    ).toBe('Hello world');
  });

  it('handles double-encoded HTML', () => {
    expect(htmlToText('&amp;lt;p&amp;gt;Hello&amp;lt;/p&amp;gt;')).toBe('Hello');
  });

  it('removes scripts and styles entirely', () => {
    expect(htmlToText('<style>.x{}</style><p>Hi</p><script>alert(1)</script>')).toBe('Hi');
  });

  it('keeps list structure', () => {
    expect(htmlToText('<ul><li>One</li><li>Two</li></ul>')).toBe('• One\n• Two');
  });

  it('normalizes whitespace and truncates', () => {
    expect(htmlToText('  A&nbsp;&nbsp; B  ', 4)).toBe('A B');
    expect(htmlToText('abcdefgh', 4)).toBe('abcd');
  });
});
