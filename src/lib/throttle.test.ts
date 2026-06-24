import { describe, it, expect, vi, afterEach } from "vitest";
import { isLocked, recordFailure, recordSuccess } from "./throttle";

// State lives on globalThis, so each test uses a unique key for isolation.
let n = 0;
const freshKey = () => `test-key-${Date.now()}-${n++}`;

afterEach(() => vi.useRealTimers());

describe("login throttle", () => {
  it("locks only on the 5th consecutive failure", () => {
    const k = freshKey();
    for (let i = 0; i < 4; i++) {
      expect(recordFailure(k)).toBe(false);
      expect(isLocked(k)).toBe(false);
    }
    expect(recordFailure(k)).toBe(true); // 5th
    expect(isLocked(k)).toBe(true);
  });

  it("recordSuccess clears accumulated failures", () => {
    const k = freshKey();
    recordFailure(k);
    recordFailure(k);
    recordSuccess(k);
    // Counter reset: it should again take 5 failures to lock.
    for (let i = 0; i < 4; i++) expect(recordFailure(k)).toBe(false);
    expect(recordFailure(k)).toBe(true);
  });

  it("lock expires after the lock window", () => {
    vi.useFakeTimers();
    const k = freshKey();
    for (let i = 0; i < 5; i++) recordFailure(k);
    expect(isLocked(k)).toBe(true);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(isLocked(k)).toBe(false);
  });

  it("failures outside the window do not accumulate to a lock", () => {
    vi.useFakeTimers();
    const k = freshKey();
    for (let i = 0; i < 4; i++) recordFailure(k);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1); // window elapses
    // A failure now starts a fresh window — not the 5th of the old one.
    expect(recordFailure(k)).toBe(false);
    expect(isLocked(k)).toBe(false);
  });
});
