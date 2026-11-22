import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { internalHeaders, readAuthConfig } from "./config.ts";

const secret = Buffer.alloc(32, 7).toString("base64");
const valid = { NEXT_PUBLIC_API_URL: "http://api.test/", INTERNAL_API_SECRET: "s", SESSION_COOKIE_SECRET: secret };

describe("readAuthConfig", () => {
  for (const missing of ["NEXT_PUBLIC_API_URL", "INTERNAL_API_SECRET", "SESSION_COOKIE_SECRET"]) {
    it(`throws without ${missing}`, () => assert.throws(() => readAuthConfig({ ...valid, [missing]: undefined }), /Missing auth configuration/));
  }
  it("throws when the secret is not 32 bytes", () => {
    assert.throws(() => readAuthConfig({ ...valid, SESSION_COOKIE_SECRET: Buffer.alloc(16).toString("base64") }), /32 random bytes/);
  });
  it("parses a valid config and strips the trailing slash", () => {
    const config = readAuthConfig(valid);
    assert.equal(config.cookieSecret.length, 32);
    assert.equal(config.apiUrl, "http://api.test");
    assert.equal(config.internalSecret, "s");
  });
  it("is secure only in production", () => {
    assert.equal(readAuthConfig({ ...valid, NODE_ENV: "production" }).secureCookie, true);
    assert.equal(readAuthConfig({ ...valid, NODE_ENV: "development" }).secureCookie, false);
    assert.equal(readAuthConfig(valid).secureCookie, false);
  });
});

describe("internalHeaders", () => {
  const config = readAuthConfig(valid);
  const headers = (h: Record<string, string>) => ({ get: (name: string) => h[name] ?? null });
  it("takes the first forwarded IP, trimmed", () => {
    const out = internalHeaders(config, headers({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8", "user-agent": "ua" }));
    assert.equal(out["x-client-ip"], "1.2.3.4");
    assert.equal(out["x-internal-secret"], "s");
    assert.equal(out["x-client-user-agent"], "ua");
  });
  it("uses an empty string when absent", () => {
    const out = internalHeaders(config, headers({}));
    assert.equal(out["x-client-ip"], "");
    assert.equal(out["x-client-user-agent"], "");
  });
});
