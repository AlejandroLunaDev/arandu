import { EncryptJWT, jwtDecrypt } from "jose";

export interface SessionCookie {
  accessToken: string;
  /** Epoch milliseconds. */
  accessTokenExpiresAt: number;
  refreshToken: string;
}

/** The API's absolute session lifetime (90 days): the cookie never outlives the session. */
const MAX_AGE_SECONDS = 90 * 24 * 3600;

/** `__Host-` requires HTTPS, so local development uses a plain name. */
export function sessionCookieName(secure: boolean): string {
  return secure ? "__Host-session" : "session";
}

export function sessionCookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: MAX_AGE_SECONDS };
}

/** Deleting a `__Host-` cookie needs the same attributes it was set with. */
export function expiredCookieOptions(secure: boolean) {
  return { ...sessionCookieOptions(secure), maxAge: 0 };
}

export function toSessionCookie(pair: { accessToken: string; accessTokenExpiresIn: number; refreshToken: string }, now = Date.now()): SessionCookie {
  return { accessToken: pair.accessToken, accessTokenExpiresAt: now + pair.accessTokenExpiresIn * 1000, refreshToken: pair.refreshToken };
}

/** Encrypts (JWE, dir + A256GCM): whoever copies the cookie cannot read or change it. */
export function sealSession(session: SessionCookie, key: Uint8Array): Promise<string> {
  return new EncryptJWT({ ...session }).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setIssuedAt().encrypt(key);
}

/** Null for anything that is not a cookie this server sealed: forged, tampered or sealed with another key. */
export async function openSession(value: string, key: Uint8Array): Promise<SessionCookie | null> {
  try {
    const { payload } = await jwtDecrypt(value, key);
    const { accessToken, accessTokenExpiresAt, refreshToken } = payload;
    if (typeof accessToken !== "string" || typeof refreshToken !== "string" || typeof accessTokenExpiresAt !== "number") return null;
    return { accessToken, accessTokenExpiresAt, refreshToken };
  } catch {
    return null;
  }
}
