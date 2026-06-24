import { describe, it, expect } from "vitest";
import { encryptPII, decryptPII, piiHash } from "./crypto";

describe("encryptPII / decryptPII", () => {
  it("round-trips a value", () => {
    const phone = "3014567890";
    const blob = encryptPII(phone);
    expect(decryptPII(blob)).toBe(phone);
  });

  it("never emits the plaintext and is non-deterministic (random IV)", () => {
    const phone = "3014567890";
    const a = encryptPII(phone);
    const b = encryptPII(phone);
    expect(a).not.toContain(phone);
    expect(a).not.toBe(b); // distinct IVs => distinct ciphertext
    expect(decryptPII(a)).toBe(decryptPII(b));
  });

  it("has the iv:tag:cipher shape", () => {
    expect(encryptPII("x").split(":")).toHaveLength(3);
  });

  it("returns '' on tampered or malformed input instead of throwing", () => {
    expect(decryptPII("garbage")).toBe("");
    expect(decryptPII("")).toBe("");
    const blob = encryptPII("3014567890");
    const tampered = blob.slice(0, -4) + "AAAA"; // corrupt the ciphertext
    expect(decryptPII(tampered)).toBe("");
  });
});

describe("piiHash", () => {
  it("is deterministic for equality lookups", () => {
    expect(piiHash("3014567890")).toBe(piiHash("3014567890"));
  });

  it("differs across inputs and is not the plaintext", () => {
    const h = piiHash("3014567890");
    expect(h).not.toBe(piiHash("3019999999"));
    expect(h).not.toContain("3014567890");
  });
});
