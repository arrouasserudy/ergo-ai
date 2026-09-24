import { describe, expect, it } from "vitest";
import { parseEvents } from "./events";

describe("parseEvents", () => {
  it("parses complete lines and keeps the partial one", () => {
    const { events, rest } = parseEvents('{"type":"search","query":"x"}\n{"type":"text","text":"Hel');
    expect(events).toEqual([{ type: "search", query: "x" }]);
    expect(rest).toBe('{"type":"text","text":"Hel');
  });

  it("skips blank and malformed lines", () => {
    expect(parseEvents('\n{oops}\n{"type":"done"}\n').events).toEqual([{ type: "done" }]);
  });
});
