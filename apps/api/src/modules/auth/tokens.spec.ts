import { SignJWT } from 'jose';
import { sameSecret, signAccessToken, verifyAccessToken } from './tokens.js';

const SECRET = 'a'.repeat(32);

describe('access tokens', () => {
  it('round-trips the subject and the session', async () => {
    const token = await signAccessToken({ sub: 'u', sid: 's' }, SECRET, 60);

    await expect(verifyAccessToken(token, SECRET)).resolves.toEqual({
      sub: 'u',
      sid: 's',
    });
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signAccessToken({ sub: 'u', sid: 's' }, SECRET, 60);

    await expect(verifyAccessToken(token, 'b'.repeat(32))).resolves.toBeNull();
  });

  it('rejects an expired token but not one inside the clock tolerance', async () => {
    const expired = await signAccessToken({ sub: 'u', sid: 's' }, SECRET, -60);
    const drifted = await signAccessToken({ sub: 'u', sid: 's' }, SECRET, -3);

    await expect(verifyAccessToken(expired, SECRET)).resolves.toBeNull();
    await expect(verifyAccessToken(drifted, SECRET)).resolves.not.toBeNull();
  });

  it('rejects garbage and a token without a session', async () => {
    const noSid = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u')
      .setIssuer('arandu-api')
      .setExpirationTime('1m')
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifyAccessToken('nope', SECRET)).resolves.toBeNull();
    await expect(verifyAccessToken(noSid, SECRET)).resolves.toBeNull();
  });
});

describe('sameSecret', () => {
  it('is true only for the same string', () => {
    expect(sameSecret('abc', 'abc')).toBe(true);
    expect(sameSecret('abd', 'abc')).toBe(false);
  });

  it('is false, without throwing, for a non-string or a different length', () => {
    expect(sameSecret(undefined, 'abc')).toBe(false);
    expect(sameSecret(['abc'], 'abc')).toBe(false);
    expect(sameSecret('abcd', 'abc')).toBe(false);
  });
});
