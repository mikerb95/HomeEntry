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
