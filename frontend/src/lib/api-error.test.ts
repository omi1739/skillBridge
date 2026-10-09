import { describe, it, expect } from 'vitest';
import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it('prefers the actionable Nest message over the generic reason phrase', () => {
    expect(
      apiErrorMessage(
        { statusCode: 400, message: 'Password must be at least 8 characters long.', error: 'Bad Request' },
        'fallback'
      )
    ).toBe('Password must be at least 8 characters long.');
  });

  it('joins class-validator message arrays instead of showing the reason phrase', () => {
    const body = {
      statusCode: 400,
      message: ['email must be an email', 'password is too short'],
      error: 'Bad Request'
    };
    expect(apiErrorMessage(body, 'fallback')).toBe('email must be an email password is too short');
  });

  it('falls back to `error` only when `message` is absent', () => {
    expect(apiErrorMessage({ error: 'Unauthorized' }, 'fallback')).toBe('Unauthorized');
  });

  it('returns the fallback for null, non-objects, and empty strings', () => {
    expect(apiErrorMessage(null, 'fallback')).toBe('fallback');
    expect(apiErrorMessage('nope', 'fallback')).toBe('fallback');
    expect(apiErrorMessage({}, 'fallback')).toBe('fallback');
    expect(apiErrorMessage({ message: '   ' }, 'fallback')).toBe('fallback');
    expect(apiErrorMessage({ message: [null, '', '  '] }, 'fallback')).toBe('fallback');
  });
});
