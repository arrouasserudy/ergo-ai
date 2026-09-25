/** Minimal reading of PubMed Central BioC JSON articles (shared by the corpus scripts). */
import fs from "node:fs";
import path from "node:path";

export const CORPUS_DIR = path.join(process.cwd(), "data", "corpus");
export const RAW_DIR = path.join(CORPUS_DIR, "raw");

export type BiocPassage = { infons: Record<string, string>; text: string };

export function readArticle(sourceId: string): BiocPassage[] | null {
  try {
    const json = JSON.parse(fs.readFileSync(path.join(RAW_DIR, `${sourceId}.json`), "utf8"));
    return (Array.isArray(json) ? json[0] : json).documents[0].passages;
  } catch {
    return null; // an error page saved by an older fetch
  }
}

export function listArticleIds(): string[] {
  return fs.existsSync(RAW_DIR) ? fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort() : [];
}

/** Title, year, abstract and whether the full text is available. */
export function summarize(passages: BiocPassage[]) {
  const front = passages[0];
  const types = new Set(passages.map((p) => p.infons.section_type));
  const abstract = passages
    .filter((p) => p.infons.section_type === "ABSTRACT" && (p.infons.type ?? "").startsWith("abstract") && !(p.infons.type ?? "").includes("title"))
    .map((p) => p.text.trim())
    .join(" ");
  const intro = passages.find((p) => p.infons.section_type === "INTRO" && p.infons.type === "paragraph")?.text ?? "";
  const year = Number(front.infons.year);
  return {
    title: front.text.trim(),
    year: Number.isFinite(year) ? year : null,
    fullText: types.has("INTRO") || types.has("RESULTS") || types.has("DISCUSS"),
    abstract: (abstract || intro).replace(/\s+/g, " ").trim(),
    license: front.infons.license ?? "",
  };
}

/** One screening decision per article, written while reviewing candidate batches. */
export type Screening = {
  keep: boolean;
  /** A: directly practice-relevant, strong design (review, trial, guideline). B: useful. C: marginal. */
  level: "A" | "B" | "C";
  type: "review" | "trial" | "observational" | "qualitative" | "assessment" | "case" | "other";
  reason: string;
};

export const SCREENING_FILE = path.join(CORPUS_DIR, "screening.json");
export const DECISIONS_FILE = path.join(CORPUS_DIR, "decisions.json");

export function readJson<T>(file: string, fallback: T): T {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : fallback;
}
