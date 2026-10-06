import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EVENTS, sanitizeProps } from "./events";

const SRC = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [full] : [];
  });
}

/** Event names written next to a tracking call: `track(…, "x")`, `trackEvent("x")`, `data-track="x"` (or a ternary of names). */
function usedNames() {
  const used = new Map<string, Set<string>>();
  for (const file of sourceFiles(SRC)) {
    if (file.endsWith(path.join("analytics", "events.ts"))) continue;
    const text = fs.readFileSync(file, "utf8");
    const calls = text.match(/\b(?:track|trackEvent)\([^;]*?\)|data-track=(?:"[^"]*"|\{[^}]*\})/g) ?? [];
    for (const call of calls) {
      for (const [, name] of call.matchAll(/"([a-z_]+\.[a-z_]+)"/g)) {
        const kind = call.startsWith("track(") ? "server" : "client";
        used.set(name, (used.get(name) ?? new Set()).add(kind));
      }
    }
  }
  return used;
}

describe("EVENTS", () => {
  const used = usedNames();

  it("lists every name used in the code", () => {
    expect([...used.keys()].filter((name) => !(name in EVENTS))).toEqual([]);
  });

  it("has every name used, from the right side", () => {
    for (const [name, { source }] of Object.entries(EVENTS)) {
      expect(used.get(name), name).toEqual(new Set([source]));
    }
  });
});

describe("sanitizeProps", () => {
  it("keeps short primitive values with simple keys", () => {
    expect(sanitizeProps({ recipient: "parents", count: 3, edited: true })).toEqual({ recipient: "parents", count: 3, edited: true });
  });

  it("drops objects, bad keys and non-finite numbers, and truncates strings", () => {
    const props = sanitizeProps({ nested: { a: 1 }, "bad key": "x", n: Number.NaN, s: "x".repeat(100) });
    expect(props).toEqual({ s: "x".repeat(64) });
  });

  it("keeps at most five props and returns null when nothing is left", () => {
    expect(Object.keys(sanitizeProps({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 })!)).toHaveLength(5);
    expect(sanitizeProps({ x: null })).toBeNull();
    expect(sanitizeProps(undefined)).toBeNull();
  });
});
