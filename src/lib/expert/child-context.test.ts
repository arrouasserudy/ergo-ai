import { describe, expect, it } from "vitest";
import type { Child, Episode } from "@/db/schema";
import { childContextText } from "./child-context";

const child = {
  id: "c1",
  initials: "L. M.",
  birthDate: "2019-02-03",
  referralReason: "Fine motor skills",
  schoolLevel: "CE1",
  hyperSensitivities: ["noise", "clothing"],
  hypoReactivities: [],
  seeksDeepPressure: true,
  backgroundFactors: ["sleep"],
  knownTriggers: "Socks",
  warningSigns: null,
  calmingStrategies: ["quietCorner"],
  interests: ["dinosaurs"],
} as unknown as Child;

const crisis = (causes: string[]) =>
  ({ kind: "crisis", status: "closed", causes, helped: ["removeCause"], startedAt: new Date("2026-09-01T10:00:00Z"), antecedent: "Sarah took his socks" }) as unknown as Episode;

describe("childContextText", () => {
  it("never includes initials or free-text crisis notes", () => {
    const text = childContextText(child, [crisis(["clothing"]), crisis(["clothing"])], "Asia/Jerusalem");
    expect(text).not.toContain("L. M.");
    expect(text).not.toContain("Sarah");
    expect(text).toContain("Sensory hypersensitivities: noise, clothing");
    expect(text).toContain('most frequent trigger "clothing" (2/2)');
  });

  it("omits empty sections", () => {
    const text = childContextText(child, [], "Asia/Jerusalem");
    expect(text).not.toContain("hyporeactivity");
    expect(text).not.toContain("crises");
  });
});
