/**
 * Prints downloaded articles not yet screened, in compact batches, for the relevance
 * screen: id | year | full text or abstract | topics | title, then the abstract start.
 * Decisions are recorded in data/corpus/screening.json (see Screening in bioc.ts).
 *
 *   pnpm corpus:candidates                  # first batch of unscreened articles
 *   pnpm corpus:candidates --batch 2        # next batch
 *   pnpm corpus:candidates --stats
 */
import path from "node:path";
import { CORPUS_DIR, listArticleIds, readArticle, readJson, SCREENING_FILE, summarize, type Screening } from "./bioc";

const args = process.argv.slice(2);
const opt = (name: string, fallback: number) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const size = opt("--size", 50);
const batch = opt("--batch", 1);

const screening = readJson<Record<string, Screening>>(SCREENING_FILE, {});
const topics = readJson<Record<string, string[]>>(path.join(CORPUS_DIR, "candidates.json"), {});
const ids = listArticleIds();
const pending = ids.filter((id) => !screening[id]);

if (args.includes("--stats")) {
  const kept = Object.values(screening).filter((s) => s.keep);
  const byLevel = (l: string) => kept.filter((s) => s.level === l).length;
  console.log(`${ids.length} downloaded, ${Object.keys(screening).length} screened (${kept.length} kept: A ${byLevel("A")}, B ${byLevel("B")}, C ${byLevel("C")}), ${pending.length} pending.`);
  process.exit(0);
}

const slice = pending.slice((batch - 1) * size, batch * size);
console.log(`# batch ${batch}: ${slice.length} of ${pending.length} unscreened\n`);
for (const id of slice) {
  const passages = readArticle(id);
  if (!passages) {
    console.log(`${id} | UNREADABLE\n`);
    continue;
  }
  const s = summarize(passages);
  const abstract = s.abstract.length > 320 ? `${s.abstract.slice(0, 320)}…` : s.abstract;
  console.log(`${id} | ${s.year ?? "?"} | ${s.fullText ? "full" : "abstract-only"} | ${(topics[id] ?? []).join(",") || "-"}`);
  console.log(`  ${s.title}`);
  console.log(`  ${abstract || "(no abstract)"}\n`);
}
