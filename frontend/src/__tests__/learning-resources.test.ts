import { describe, it, expect } from 'vitest';
import { resolveResources } from '@/lib/learning-resources';

describe('resolveResources keyword matching', () => {
  it('matches a standalone "C" but not text that merely contains the letter c', () => {
    expect(resolveResources('I write low-level C for embedded systems').map(t => t.key)).toContain('c');
    expect(resolveResources('javascript for the web').find(t => t.key === 'c')).toBeUndefined();
    expect(resolveResources('coder, chronicles, canvas').find(t => t.key === 'c')).toBeUndefined();
  });

  it('matches "C++" even though the keyword ends with punctuation', () => {
    expect(resolveResources('C++ game engines').map(t => t.key)).toContain('cpp');
  });

  it('does not let "java" match "javascript"', () => {
    expect(resolveResources('modern javascript and typescript').map(t => t.key)).not.toContain('java');
    expect(resolveResources('Java enterprise backends').find(t => t.key === 'java')).toBeTruthy();
  });

  it('matches phrases with word boundaries (node.js, REST APIs)', () => {
    expect(resolveResources('building a Node.js REST API').map(t => t.key)).toEqual(
      expect.arrayContaining(['nodejs', 'rest-apis'])
    );
  });

  it('returns an empty list for empty or null text', () => {
    expect(resolveResources('')).toEqual([]);
    expect(resolveResources(null)).toEqual([]);
    expect(resolveResources(undefined)).toEqual([]);
  });
});