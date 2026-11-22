export interface AuthConfig {
  apiUrl: string;
  /** Sent as `x-internal-secret`: the API answers only this server, never a browser. */
  internalSecret: string;
  /** Seals the session cookie. */
  cookieSecret: Uint8Array;
  secureCookie: boolean;
}

/** The server's auth settings. Uses atob, so it also runs in the proxy. */
export function readAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
  const { NEXT_PUBLIC_API_URL: apiUrl, INTERNAL_API_SECRET: internalSecret, SESSION_COOKIE_SECRET: secret } = env;
  if (!apiUrl || !internalSecret || !secret) {
    throw new Error("Missing auth configuration: NEXT_PUBLIC_API_URL, INTERNAL_API_SECRET and SESSION_COOKIE_SECRET are required");
  }
  const cookieSecret = Uint8Array.from(atob(secret), (char) => char.charCodeAt(0));
  if (cookieSecret.length !== 32) {
    throw new Error("SESSION_COOKIE_SECRET must be 32 random bytes, base64-encoded (openssl rand -base64 32)");
  }
  return { apiUrl: apiUrl.replace(/\/$/, ""), internalSecret, cookieSecret, secureCookie: env.NODE_ENV === "production" };
}

/** What every call to the API carries from the browser's request: the secret, and the browser's IP and user agent. */
export function internalHeaders(config: AuthConfig, incoming: { get(name: string): string | null }): Record<string, string> {
  return {
    "x-internal-secret": config.internalSecret,
    // The browser's IP is the first entry of `x-forwarded-for`, as the host (Vercel) sets it.
    "x-client-ip": (incoming.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "",
    "x-client-user-agent": incoming.get("user-agent") ?? "",
  };
}
