/**
 * Tests for auth/src/store.ts
 *
 * We import resetForTesting() and call it in beforeEach so each test starts
 * with a clean slate. This is safer than the old STORE_FILE env trick, which
 * was brittle if any transitive import also read the env at import time.
 */
import { describe, it, expect, beforeEach } from 'bun:test';

const { getToken, setToken, createCode, redeemCode, resetForTesting } = await import('./store.js');

beforeEach(() => {
  resetForTesting();
});

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

describe('setToken / getToken', () => {
  it('stores and retrieves a token', () => {
    setToken('user-1', 'tok-abc');
    expect(getToken('user-1')).toBe('tok-abc');
  });

  it('overwrites an existing token', () => {
    setToken('user-2', 'first');
    setToken('user-2', 'second');
    expect(getToken('user-2')).toBe('second');
  });

  it('returns undefined for an unknown githubId', () => {
    expect(getToken('does-not-exist')).toBeUndefined();
  });

  it('keeps separate tokens for different users', () => {
    setToken('alice', 'tok-alice');
    setToken('bob', 'tok-bob');
    expect(getToken('alice')).toBe('tok-alice');
    expect(getToken('bob')).toBe('tok-bob');
  });
});

// ---------------------------------------------------------------------------
// One-time auth codes
// ---------------------------------------------------------------------------

const SAMPLE_DATA = {
  token: 'stdb-tok',
  githubId: 'gh-123',
  username: 'testuser',
  name: 'Test User',
  avatarUrl: 'https://example.com/avatar.png',
  email: 'test@example.com',
};

describe('createCode', () => {
  it('returns a UUID-formatted string', () => {
    const code = createCode(SAMPLE_DATA);
    expect(code).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('returns a unique code on each call', () => {
    const code1 = createCode(SAMPLE_DATA);
    const code2 = createCode(SAMPLE_DATA);
    expect(code1).not.toBe(code2);
  });
});

describe('redeemCode', () => {
  it('returns the payload for a valid code', () => {
    const code = createCode(SAMPLE_DATA);
    expect(redeemCode(code)).toEqual(SAMPLE_DATA);
  });

  it('is one-time: second redemption returns undefined', () => {
    const code = createCode(SAMPLE_DATA);
    redeemCode(code); // first — succeeds
    expect(redeemCode(code)).toBeUndefined(); // second — gone
  });

  it('returns undefined for an unknown code', () => {
    expect(redeemCode('00000000-0000-0000-0000-000000000000')).toBeUndefined();
  });

  it('returns undefined for an expired code (expiresAt in the past)', () => {
    // Inject an already-expired entry by temporarily overriding Date.now so
    // that createCode sets expiresAt = <past> + 60_000 = still past.
    const pastMs = Date.now() - 120_000; // 2 minutes ago
    const original = Date.now;
    Date.now = () => pastMs;
    let expiredCode: string;
    try {
      expiredCode = createCode(SAMPLE_DATA);
    } finally {
      Date.now = original;
    }
    // Redeem at real time — expiresAt is 2 min ago, so it should be expired.
    expect(redeemCode(expiredCode!)).toBeUndefined();
  });

  it('prunes expired codes when createCode is called', () => {
    // Create an expired code using the same time-mock trick.
    const pastMs = Date.now() - 120_000;
    const original = Date.now;
    Date.now = () => pastMs;
    let expiredCode: string;
    try {
      expiredCode = createCode(SAMPLE_DATA);
    } finally {
      Date.now = original;
    }

    // The expired code is now in memory; call createCode at real time to
    // trigger the pruning pass.  After pruning, redeemCode must return
    // undefined because the entry was deleted.
    createCode(SAMPLE_DATA); // triggers pruning
    expect(redeemCode(expiredCode!)).toBeUndefined();
  });
});
