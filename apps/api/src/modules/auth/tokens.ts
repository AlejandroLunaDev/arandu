import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

const ISSUER = 'arandu-api';

/** The access token proves identity and session only: a JWT is signed, not encrypted (v2.0 ADR-0009). */
export interface AccessClaims {
  sub: string;
  sid: string;
}

export function signAccessToken(
  claims: AccessClaims,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT({ sid: claims.sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(new TextEncoder().encode(secret));
}

/** Null for any token this API did not sign, or that expired. */
export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      // A few seconds of drift between instances must not reject a fresh token.
      { algorithms: ['HS256'], issuer: ISSUER, clockTolerance: 5 },
    );
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string')
      return null;
    return { sub: payload.sub, sid: payload.sid };
  } catch {
    return null;
  }
}

/** 256 random bits; only its hash is stored. */
export const newRefreshToken = () => randomBytes(32).toString('base64url');

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

/** Constant-time comparison; hashing first hides the secret's length too. */
export function sameSecret(presented: unknown, expected: string): boolean {
  if (typeof presented !== 'string') return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(presented), digest(expected));
}
