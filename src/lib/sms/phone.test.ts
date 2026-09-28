import { describe, expect, it } from "vitest";
import { normalizePhone, smsHref } from "./phone";

describe("normalizePhone", () => {
  it("reads national and international Israeli numbers", () => {
    expect(normalizePhone("050-123 4567")).toBe("+972501234567");
    expect(normalizePhone("+972 50 123 4567")).toBe("+972501234567");
    expect(normalizePhone("972501234567")).toBe("+972501234567");
    expect(normalizePhone("00972-50-1234567")).toBe("+972501234567");
  });

  it("uses the given country code for national numbers", () => {
    expect(normalizePhone("06 12 34 56 78", "33")).toBe("+33612345678");
  });

  it("rejects what is not a phone number", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("05O-1234567")).toBeNull();
    expect(normalizePhone("501234567")).toBeNull();
  });
});

describe("smsHref", () => {
  it("encodes the message", () => {
    expect(smsHref("+972501234567", "שלום & תודה")).toBe(`sms:+972501234567?&body=${encodeURIComponent("שלום & תודה")}`);
  });
});
