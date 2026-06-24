import { describe, it, expect } from "vitest";
import {
  makeOtpCode,
  hashOtpCode,
  signOtpToken,
  verifyOtpToken,
  RegisterOtpClaims,
} from "./otp";

const claims: RegisterOtpClaims = {
  purpose: "register-otp",
  conjuntoId: "c1",
  slug: "demo",
  aptoKey: "T1-101",
  tower: "T1",
  apt: "101",
  phoneEnc: "enc",
  phoneHash: "hash",
  pinHash: "pin",
  codeHash: hashOtpCode("123456"),
};

describe("makeOtpCode", () => {
  it("is always 6 digits", () => {
    for (let i = 0; i < 200; i++) {
      expect(makeOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode", () => {
  it("is deterministic and hides the code", () => {
    expect(hashOtpCode("123456")).toBe(hashOtpCode("123456"));
    expect(hashOtpCode("123456")).not.toBe(hashOtpCode("000000"));
    expect(hashOtpCode("123456")).not.toContain("123456");
  });
});

describe("signOtpToken / verifyOtpToken", () => {
  it("round-trips the registration claims", async () => {
    const token = await signOtpToken(claims);
    const back = await verifyOtpToken(token);
    expect(back?.aptoKey).toBe("T1-101");
    expect(back?.codeHash).toBe(claims.codeHash);
  });

  it("rejects a tampered or malformed token", async () => {
    expect(await verifyOtpToken("not-a-jwt")).toBeNull();
    const token = await signOtpToken(claims);
    expect(await verifyOtpToken(token + "x")).toBeNull();
  });
});
