import { describe, expect, it } from "vitest";
import { parsePwen, pwenChangeRejected } from "../src/utils/pwen";

describe("Pwen security validation", () => {
  it.each([
    [10, 10],
    ["10", 10],
    ["0010", 10],
  ])("accepts positive whole-number stake %p", (input, expected) => {
    expect(parsePwen(input)).toBe(expected);
  });

  it.each([
    -100, 0, 10.5, "10.5", "-100", "10abc", "", " ", null, undefined,
    Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1,
  ])("rejects unsafe stake %p", (input) => {
    expect(parsePwen(input)).toBeNull();
  });

  it("allows an update that repeats the existing stake", () => {
    expect(pwenChangeRejected(10, 10)).toBe(false);
    expect(pwenChangeRejected("10", 10)).toBe(false);
  });

  it("allows updates that omit pwen", () => {
    expect(pwenChangeRejected(undefined, 10)).toBe(false);
    expect(pwenChangeRejected(null, 10)).toBe(false);
  });

  it.each([-100, 0, 10.5, 11, 1000, "-100", "11"])(
    "blocks changing an existing stake to %p",
    (requested) => {
      expect(pwenChangeRejected(requested, 10)).toBe(true);
    }
  );
});
