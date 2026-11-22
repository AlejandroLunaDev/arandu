import { NextResponse, type NextRequest } from "next/server";
import { internalHeaders, readAuthConfig } from "./config";
import { REFRESH_FAILED_HEADER, expiredCookieOptions, openSession, sealSession, sessionCookieName, sessionCookieOptions, toSessionCookie } from "./cookie";
import { refreshTokens } from "./refresh";

/** Refresh a little before expiry, so a request never reaches the API with a dying token. */
const REFRESH_SKEW_MS = 60_000;

/**
 * Runs in the proxy: refreshing happens here because Server Components cannot write cookies. Not the security
 * boundary: the data access layer and the API check the session again.
 */
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const config = readAuthConfig();
  const name = sessionCookieName(config.secureCookie);
  const raw = request.cookies.get(name)?.value;
  if (!raw) return NextResponse.next();

  const session = await openSession(raw, config.cookieSecret);
  if (session && session.accessTokenExpiresAt - Date.now() > REFRESH_SKEW_MS) return NextResponse.next();

  let pair = null;
  if (session) {
    try {
      pair = await refreshTokens(config, session.refreshToken, internalHeaders(config, request.headers));
    } catch {
      // The API is asleep or busy: keep the cookie, let the next request try again, and tell this one that its
      // session cannot be used just now (getSession), however long the old token still has.
      const headers = new Headers(request.headers);
      headers.set(REFRESH_FAILED_HEADER, "1");
      return NextResponse.next({ request: { headers } });
    }
  }
  if (!pair) {
    request.cookies.delete(name);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(name, "", expiredCookieOptions(config.secureCookie));
    return response;
  }

  const sealed = await sealSession(toSessionCookie(pair), config.cookieSecret);
  // Written on the request too, so the Server Components of this same request see the new tokens.
  request.cookies.set(name, sealed);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(name, sealed, sessionCookieOptions(config.secureCookie));
  return response;
}
