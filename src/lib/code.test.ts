import { describe, it, expect } from "vitest";
import { makeAuthCode, isGrantExpired, GRANT_GRACE_MS } from "./code";

describe("makeAuthCode", () => {
  it("has the requested length and uses only the safe alphabet", () => {
    const code = makeAuthCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]+$/); // no 0/O/1/I
    expect(makeAuthCode(12)).toHaveLength(12);
  });

  it("is effectively unique across many draws (no collisions in 5k)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(makeAuthCode());
    expect(seen.size).toBe(5000);
  });
});

describe("isGrantExpired", () => {
  const now = 1_000_000_000_000;

  it("is valid before and within the grace window", () => {
    expect(isGrantExpired(now, now)).toBe(false);
    expect(isGrantExpired(now - GRANT_GRACE_MS + 1, now)).toBe(false);
  });

  it("is expired once the grace window has fully elapsed", () => {
    expect(isGrantExpired(now - GRANT_GRACE_MS - 1, now)).toBe(true);
  });

  it("accepts a Date as well as a timestamp", () => {
    expect(isGrantExpired(new Date(now - GRANT_GRACE_MS - 1), now)).toBe(true);
  });
});
