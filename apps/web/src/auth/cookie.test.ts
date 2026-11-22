import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expiredCookieOptions, openSession, sealSession, SessionUnavailable, sessionCookieName, sessionCookieOptions, toSessionCookie, usableToken } from "./cookie.ts";

const key = new Uint8Array(32).fill(1);
const otherKey = new Uint8Array(32).fill(2);
const session = { accessToken: "a", accessTokenExpiresAt: 123456, refreshToken: "r" };

describe("sealSession / openSession", () => {
  it("round-trips with the same key", async () => {
    assert.deepEqual(await openSession(await sealSession(session, key), key), session);
  });
  it("returns null with a different key", async () => {
    assert.equal(await openSession(await sealSession(session, key), otherKey), null);
  });
  it("returns null for a tampered value", async () => {
    const sealed = await sealSession(session, key);
    const mid = Math.floor(sealed.length / 2);
    const tampered = sealed.slice(0, mid) + (sealed[mid] === "A" ? "B" : "A") + sealed.slice(mid + 1);
    assert.equal(await openSession(tampered, key), null);
  });
  it("returns null for garbage", async () => assert.equal(await openSession("garbage", key), null));
});

describe("toSessionCookie", () => {
  it("computes the expiry from now", () => {
    assert.deepEqual(toSessionCookie({ accessToken: "a", accessTokenExpiresIn: 900, refreshToken: "r" }, 1000), {
      accessToken: "a",
      accessTokenExpiresAt: 901000,
      refreshToken: "r",
    });
  });
});

describe("usableToken", () => {
  it("returns null with no session", () => assert.equal(usableToken(null, 1000), null));
  it("returns the access token while it has not expired", () => {
    assert.equal(usableToken({ ...session, accessTokenExpiresAt: 1001 }, 1000), "a");
  });
  it("throws SessionUnavailable when the access token expired, including at the exact expiry", () => {
    assert.throws(() => usableToken({ ...session, accessTokenExpiresAt: 999 }, 1000), SessionUnavailable);
    assert.throws(() => usableToken({ ...session, accessTokenExpiresAt: 1000 }, 1000), SessionUnavailable);
  });
});

describe("cookie names and options", () => {
  it("uses __Host- only when secure", () => {
    assert.equal(sessionCookieName(true), "__Host-session");
    assert.equal(sessionCookieName(false), "session");
  });
  it("is httpOnly, lax, path /", () => {
    const o = sessionCookieOptions(true);
    assert.equal(o.httpOnly, true);
    assert.equal(o.secure, true);
    assert.equal(o.sameSite, "lax");
    assert.equal(o.path, "/");
  });
  it("expires immediately keeping the other attributes", () => {
    const o = expiredCookieOptions(true);
    assert.equal(o.maxAge, 0);
    assert.equal(o.secure, true);
    assert.equal(o.path, "/");
  });
});
