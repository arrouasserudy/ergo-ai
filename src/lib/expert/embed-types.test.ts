import { describe, expect, it } from "vitest";
import { quantizeToInt8 } from "./embed-types";

describe("quantizeToInt8", () => {
  it("normalizes then scales to the int8 range", () => {
    expect(Array.from(quantizeToInt8([3, 4]))).toEqual([76, 102]); // 0.6·127, 0.8·127
    expect(Array.from(quantizeToInt8([0, 0]))).toEqual([0, 0]);
  });
});
