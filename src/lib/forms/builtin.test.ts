import { describe, expect, it } from "vitest";
import { planBuiltinSync } from "./builtin";
import { BUILTIN_DEFINITIONS, BUILTIN_FORMS } from "./defaults";
import { allFields, formSchema } from "./schema";

describe("built-in forms", () => {
  it("have unique keys and positive versions", () => {
    const keys = BUILTIN_FORMS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const form of BUILTIN_FORMS) {
      expect(form.key).toMatch(/^[a-z_]+$/);
      expect(Number.isInteger(form.version) && form.version > 0).toBe(true);
    }
  });

  it.each(BUILTIN_FORMS.map((f) => [f.key, f] as const))("%s is a valid form, normalized without losing anything", (_key, form) => {
    expect(formSchema.safeParse(form.schema).success).toBe(true);
    expect(form.schema.language).toBe("he");
    const source = BUILTIN_DEFINITIONS.find((d) => d.key === form.key)!.source;
    // normalizeForm drops empty fields/sections and falls back to text on empty lists: none expected.
    expect(form.schema.sections).toHaveLength(source.sections.length);
    expect(allFields(form.schema).map((f) => [f.type, f.label])).toEqual(source.sections.flatMap((s) => s.fields.map((f) => [f.type, f.label])));
  });

  it("ships the eating observation and the evaluation form", () => {
    expect(BUILTIN_FORMS.map((f) => f.schema.title)).toEqual(["תצפית אכילה", "טופס הערכה"]);
  });
});

describe("planBuiltinSync", () => {
  const forms = [
    { key: "a", version: 2, schema: BUILTIN_FORMS[0].schema },
    { key: "b", version: 1, schema: BUILTIN_FORMS[1].schema },
  ];

  it("inserts every form in a new cabinet", () => {
    expect(planBuiltinSync([], forms)).toEqual({ insert: forms, update: [] });
  });

  it("ignores the cabinet's own forms and leaves current versions alone", () => {
    const stored = [
      { builtinKey: null, builtinVersion: null },
      { builtinKey: "a", builtinVersion: 2 },
      { builtinKey: "b", builtinVersion: 1 },
    ];
    expect(planBuiltinSync(stored, forms)).toEqual({ insert: [], update: [] });
  });

  it("updates older versions only, and inserts what is missing", () => {
    expect(planBuiltinSync([{ builtinKey: "a", builtinVersion: 1 }], forms)).toEqual({ insert: [forms[1]], update: [forms[0]] });
    expect(planBuiltinSync([{ builtinKey: "a", builtinVersion: 3 }], forms).update).toEqual([]);
  });
});
