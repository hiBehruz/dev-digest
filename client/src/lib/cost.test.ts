import { describe, expect, it } from "vitest";
import { formatCost } from "./cost";

describe("formatCost", () => {
  it.each([
    [null, "—"],
    [undefined, "—"],
    [0, "$0.00"],
    [0.0013, "$0.0013"],
    [0.014, "$0.014"],
    [0.0598, "$0.06"],
    [0.0996, "$0.10"],
    [0.1, "$0.10"],
    [1.234, "$1.23"],
  ])("%s → %s", (usd, expected) => {
    expect(formatCost(usd)).toBe(expected);
  });
});
