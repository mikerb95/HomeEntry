import { describe, it, expect } from "vitest";
import {
  encryptPII,
  decryptPII,
  decryptAmount,
  PIIDecryptError,
  piiHash,
} from "./crypto";

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

describe("decryptAmount", () => {
  it("round-trips a COP amount", () => {
    const blob = encryptPII("450000");
    expect(decryptAmount(blob)).toBe(450000);
  });

  it("throws (never returns 0) on tampered or malformed input", () => {
    // This is the behavior that differs from decryptPII: a broken decrypt
    // must never be mistaken for a legitimate $0 charge/payment/expense.
    expect(() => decryptAmount("garbage")).toThrow(PIIDecryptError);
    expect(() => decryptAmount("")).toThrow(PIIDecryptError);
    const blob = encryptPII("450000");
    const tampered = blob.slice(0, -4) + "AAAA";
    expect(() => decryptAmount(tampered)).toThrow(PIIDecryptError);
  });

  it("throws if the decrypted plaintext isn't a valid non-negative integer", () => {
    const blob = encryptPII("not-a-number");
    expect(() => decryptAmount(blob)).toThrow(PIIDecryptError);
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
