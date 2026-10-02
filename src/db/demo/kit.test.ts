import { describe, expect, it } from "vitest";
import { CAUSE_KEYS } from "../../lib/episode-catalog";
import { BUILTIN_FORMS } from "../../lib/forms/defaults";
import { normalizeForm } from "../../lib/forms/normalize";
import type { FormSchema } from "../../lib/forms/schema";
import { DEMO_CABINET_IDS, DEMO_CABINET_KEYS, demoLocale, resolveDemoTargets } from "../demo-ids";
import { en } from "./en";
import { fr } from "./fr";
import { he } from "./he";
import { demoId, fillForm, workdayOf, type DemoCabinet } from "./kit";

const CABINETS: DemoCabinet[] = [fr, he, en];

describe("demoId", () => {
  it("is stable, so production links survive a reseed", () => {
    expect(demoId(DEMO_CABINET_IDS.fr.accountId, "child:noam")).toBe("0a6de0dd-4e0d-53b7-90bc-fe99355fe660");
  });

  it("depends on the cabinet", () => {
    const ids = DEMO_CABINET_KEYS.map((k) => demoId(DEMO_CABINET_IDS[k].accountId, "credential"));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("workdayOf", () => {
  // 2026-10-01 is a Thursday.
  it("moves Friday and Saturday back to Thursday in an Israeli week", () => {
    expect(workdayOf("2026-10-01", "fri-sat")).toBe("2026-10-01");
    expect(workdayOf("2026-10-02", "fri-sat")).toBe("2026-10-01");
    expect(workdayOf("2026-10-03", "fri-sat")).toBe("2026-10-01");
    expect(workdayOf("2026-10-04", "fri-sat")).toBe("2026-10-04"); // Sunday
  });

  it("moves Saturday and Sunday back to Friday in a UK week", () => {
    expect(workdayOf("2026-10-02", "sat-sun")).toBe("2026-10-02");
    expect(workdayOf("2026-10-03", "sat-sun")).toBe("2026-10-02");
    expect(workdayOf("2026-10-04", "sat-sun")).toBe("2026-10-02");
    expect(workdayOf("2026-10-05", "sat-sun")).toBe("2026-10-05"); // Monday
  });
});

describe("resolveDemoTargets", () => {
  it("defaults to every demo cabinet", () => {
    expect(resolveDemoTargets([]).map((t) => t.key)).toEqual(["fr", "he", "en"]);
  });

  it("accepts cabinet keys and account ids", () => {
    expect(resolveDemoTargets(["he"])).toEqual([{ key: "he", accountId: DEMO_CABINET_IDS.he.accountId }]);
    expect(resolveDemoTargets([DEMO_CABINET_IDS.en.accountId])).toEqual([{ key: "en", accountId: DEMO_CABINET_IDS.en.accountId }]);
    const other = "00000000-0000-4000-8000-000000000000";
    expect(resolveDemoTargets([other])).toEqual([{ key: null, accountId: other }]);
  });

  it("refuses anything else", () => {
    expect(() => resolveDemoTargets(["de"])).toThrow();
    expect(() => resolveDemoTargets(["x'; --"])).toThrow();
  });
});

describe("demoLocale", () => {
  it("opens each demo cabinet in its own language, and leaves other accounts alone", () => {
    expect(demoLocale(DEMO_CABINET_IDS.fr.accountId)).toBe("fr");
    expect(demoLocale(DEMO_CABINET_IDS.he.accountId)).toBe("he");
    expect(demoLocale(DEMO_CABINET_IDS.en.accountId)).toBe("en");
    expect(demoLocale("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(demoLocale(undefined)).toBeNull();
  });
});

/** Every string inside a value (spec objects, report sections, answers). */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe.each(CABINETS.map((c) => [c.key, c] as const))("demo cabinet %s", (key, cabinet) => {
  const specs = cabinet.children();
  const templates = new Map<string, FormSchema>(cabinet.templates.map((t) => [t.key, normalizeForm(t.source, t.source.title, cabinet.language)]));
  if (cabinet.builtinForms === "use") for (const f of BUILTIN_FORMS) templates.set(f.key, f.schema);

  it("has its own ids, login and four children with distinct keys", () => {
    expect(cabinet.ids).toBe(DEMO_CABINET_IDS[key]);
    expect(specs).toHaveLength(4);
    expect(new Set(specs.map((c) => c.key)).size).toBe(4);
  });

  it("fills every form from its template, and links reports to existing forms and tests", () => {
    for (const spec of specs) {
      const formKeys = new Set(spec.forms.map((f) => f.key));
      const testKeys = new Set(spec.tests.map((t) => t.key));
      for (const f of spec.forms) {
        const schema = templates.get(f.template);
        expect(schema, `${spec.key}: template ${f.template}`).toBeDefined();
        if (f.answers) expect(() => fillForm(schema!, f.answers!)).not.toThrow();
      }
      for (const r of spec.reports) {
        for (const k of r.forms ?? []) expect(formKeys.has(k), `${spec.key}/${r.key}: form ${k}`).toBe(true);
        for (const k of r.assessments ?? []) expect(testKeys.has(k), `${spec.key}/${r.key}: test ${k}`).toBe(true);
      }
    }
  });

  it("uses known cause keys and writes the child as {{child}} or {{first}} in reports", () => {
    for (const spec of specs) {
      for (const e of spec.episodes) for (const c of e.causes) expect(CAUSE_KEYS as string[]).toContain(c);
      for (const r of spec.reports)
        for (const v of r.variants) {
          const text = strings([v.generated, v.edited ?? []]).join("\n");
          const words = new Set(text.split(/[\s.,:;!?()"'«»-]+/));
          expect(text).not.toContain(spec.child.name);
          expect(words.has(spec.child.name.split(" ")[0]), `${spec.key}/${r.key}: first name`).toBe(false);
        }
    }
  });

  it("writes its free text in its own language", () => {
    // Test definitions (and their items) are in the test's own language: only the comments count.
    const content = specs.map(({ tests, ...rest }) => ({ ...rest, comments: tests.map((t) => t.answers.comments) }));
    const text = strings([cabinet.account, cabinet.therapistName, cabinet.templates.map((t) => t.source), content]).join("\n");
    if (key === "en") expect(text).not.toMatch(/[\u0590-\u05FF]|[èàçù]|\b(avec|pour|dans)\b/i);
    if (key === "he") expect(text).not.toMatch(/[éèàçù]|\b(the|and|with|avec|pour|dans)\b/i);
  });
});
