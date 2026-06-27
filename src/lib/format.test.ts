import { describe, it, expect } from "vitest";
import {
  clampText,
  digits,
  fmtPhone,
  isToday,
  isValidPlate,
  normalizePlate,
} from "./format";

describe("digits", () => {
  it("strips every non-digit and tolerates null/undefined", () => {
    expect(digits("+57 300 123 4567")).toBe("573001234567");
    expect(digits("abc")).toBe("");
    expect(digits(null)).toBe("");
    expect(digits(undefined)).toBe("");
  });
});

describe("fmtPhone", () => {
  it("groups a 10-digit number and leaves others untouched", () => {
    expect(fmtPhone("3014567890")).toBe("301 456 7890");
    expect(fmtPhone("123")).toBe("123");
  });
});

describe("normalizePlate", () => {
  it("uppercases and strips separators/spaces", () => {
    expect(normalizePlate("abc-123")).toBe("ABC123");
    expect(normalizePlate(" abc 12d ")).toBe("ABC12D");
    expect(normalizePlate(null)).toBe("");
  });
});

describe("isValidPlate", () => {
  it("accepts Colombian car plates (XXX000)", () => {
    expect(isValidPlate("ABC123", "car")).toBe(true);
    expect(isValidPlate("abc-123", "car")).toBe(true);
    expect(isValidPlate("ABC12D", "car")).toBe(false);
    expect(isValidPlate("AB1234", "car")).toBe(false);
  });

  it("accepts Colombian moto plates (XXX00X)", () => {
    expect(isValidPlate("ABC12D", "moto")).toBe(true);
    expect(isValidPlate("ABC123", "moto")).toBe(false);
  });

  it("skips the pattern for foreign plates but requires content", () => {
    expect(isValidPlate("XYZ-9", "car", true)).toBe(true);
    expect(isValidPlate("1234ABCD", "moto", true)).toBe(true);
    expect(isValidPlate("AB", "car", true)).toBe(false);
    expect(isValidPlate("", "car", true)).toBe(false);
  });
});

describe("clampText", () => {
  it("trims and caps at the max length", () => {
    expect(clampText("  hola  ", 80)).toBe("hola");
    expect(clampText("abcdef", 3)).toBe("abc");
    expect(clampText(null, 5)).toBe("");
    expect(clampText(undefined, 5)).toBe("");
  });
});

describe("isToday", () => {
  it("matches the current day and rejects another", () => {
    expect(isToday(new Date())).toBe(true);
    expect(isToday(new Date(Date.now() - 48 * 3600 * 1000))).toBe(false);
  });
});
