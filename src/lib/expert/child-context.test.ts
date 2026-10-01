import { describe, expect, it } from "vitest";
import type { Child, Episode } from "@/db/schema";
import { childContextText, crisisContextText, redactChildName } from "./child-context";

const child = {
  id: "c1",
  name: "L. M.",
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
  it("never includes the name or free-text crisis notes", () => {
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

describe("crisisContextText", () => {
  const now = new Date("2026-09-10T10:20:00Z");
  const current = {
    id: "now",
    kind: "crisis",
    status: "open",
    causes: ["noise", "his sister left"],
    helped: ["headphones"],
    startedAt: new Date("2026-09-10T10:05:00Z"),
    endedAt: null,
    antecedent: "L. M. was asked to put on his shoes",
    behavior: null,
    notes: "Screamed and hid under the table",
  } as unknown as Episode;
  const past = {
    ...crisis(["clothing"]),
    id: "p1",
    endedAt: new Date("2026-09-01T10:12:00Z"),
  } as unknown as Episode;

  it("describes the current crisis and each past one, with the notes", () => {
    const text = crisisContextText(child, current, [current, past], "Asia/Jerusalem", now);
    expect(text).toContain(
      'A crisis is happening right now: time of day: midday; going on for 15 min; possible causes checked so far: noise, his sister left; tried so far: headphones; just before: "the child was asked to put on his shoes"; notes: "Screamed and hid under the table".',
    );
    expect(text).toContain('- 9 days ago: time of day: midday; lasted 12 min; causes: clothing; what helped: removeCause; just before: "Sarah took his socks"');
    expect(text).not.toContain("L. M.");
  });

  it("says when there is no past crisis", () => {
    expect(crisisContextText(child, current, [current], "Asia/Jerusalem", now)).toContain("No past crisis recorded");
  });
});

describe("redactChildName", () => {
  it("replaces the full name and each part of it", () => {
    expect(redactChildName("Léa Martin a crié, puis Léa s'est calmée. Martine est venue.", "Léa Martin")).toBe(
      "the child a crié, puis the child s'est calmée. Martine est venue.",
    );
  });

  it("replaces initials only as a whole", () => {
    expect(redactChildName("L. M. a pleuré. La maîtresse est là.", "L. M.")).toBe("the child a pleuré. La maîtresse est là.");
  });

  it("redacts initials typed in a chat message", () => {
    expect(redactChildName("comment faire manger J C? JC et j.c. aussi, je sais", "J. C.")).toBe(
      "comment faire manger the child? the child et the child aussi, je sais",
    );
  });
});
