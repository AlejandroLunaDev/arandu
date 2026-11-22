import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { refreshTokens } from "./refresh.ts";

const config = { apiUrl: "http://api.test", internalSecret: "s", cookieSecret: new Uint8Array(32), secureCookie: false };
const pair = { accessToken: "a", accessTokenExpiresIn: 900, refreshToken: "r2" };
const realFetch = globalThis.fetch;

type Call = { url: string; init: RequestInit };
function mockFetch(respond: () => Response | Promise<Response>): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return respond();
  }) as typeof fetch;
  return calls;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("refreshTokens", () => {
  it("returns the pair and sends the request", async () => {
    const calls = mockFetch(() => json(pair));
    const before = Date.now();
    assert.deepEqual(await refreshTokens(config, "tok-ok", { "x-internal-secret": "s" }), pair);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, "http://api.test/auth/refresh");
    assert.equal(calls[0]!.init.method, "POST");
    const headers = calls[0]!.init.headers as Record<string, string>;
    assert.equal(headers["x-internal-secret"], "s");
    const body = JSON.parse(calls[0]!.init.body as string);
    assert.equal(body.refreshToken, "tok-ok");
    assert.equal(typeof body.deadline, "number");
    assert.ok(body.deadline > before);
  });

  it("resolves null on invalid_refresh_token", async () => {
    mockFetch(() => json({ code: "invalid_refresh_token" }, 401));
    assert.equal(await refreshTokens(config, "tok-401", {}), null);
  });

  it("resolves null on user_banned", async () => {
    mockFetch(() => json({ code: "user_banned" }, 403));
    assert.equal(await refreshTokens(config, "tok-403", {}), null);
  });

  it("rejects on an unknown error code", async () => {
    mockFetch(() => json({ code: "whatever" }, 500));
    await assert.rejects(refreshTokens(config, "tok-500", {}));
  });

  it("rejects on a non-JSON 503", async () => {
    mockFetch(() => new Response("<html>down</html>", { status: 503 }));
    await assert.rejects(refreshTokens(config, "tok-503", {}));
  });

  it("shares one call between concurrent requests, then fetches again", async () => {
    const calls = mockFetch(() => json(pair));
    const [a, b] = await Promise.all([refreshTokens(config, "tok-sf", {}), refreshTokens(config, "tok-sf", {})]);
    assert.equal(calls.length, 1);
    assert.deepEqual(a, pair);
    assert.deepEqual(b, pair);
    await refreshTokens(config, "tok-sf", {});
    assert.equal(calls.length, 2);
  });
});
