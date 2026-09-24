/**
 * Runs the collègue expert's literature search from the terminal and prints the
 * passages the chat model would receive. Needs only an embedding key (Voyage or
 * OpenAI), no chat model: useful to judge the library before spending on answers.
 *
 *   pnpm expert:search "weighted vest attention autistic children"
 *   pnpm expert:search "handwriting grip" --limit 5
 *   pnpm expert:search "sensory diet" --account <accountId>   # also search that cabinet's uploads
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { activeEmbedder } from "../src/lib/expert/embeddings";
import { libraryMatches, searchLibrary, searchLiterature, type Passage } from "../src/lib/expert/retrieval";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const limit = Number(flag("--limit") ?? 8);
const accountId = flag("--account");
const query = args.join(" ").trim();

function open(file: string) {
  if (!fs.existsSync(file)) return null;
  const db = new Database(file, { readonly: true, fileMustExist: true });
  sqliteVec.load(db);
  return db;
}

function print(p: Passage, i: number) {
  const who = [p.authors, p.year ? `(${p.year})` : ""].filter(Boolean).join(" ");
  console.log(`\n${i + 1}. ${who ? `${who}. ` : ""}${p.title}`);
  console.log(`   ${[p.section, p.license === "cabinet" ? "document du cabinet" : p.license, p.id].filter(Boolean).join(" · ")}`);
  console.log(`   ${p.url}`);
  const text = p.text.replace(/\s+/g, " ");
  console.log(`   “${text.length > 420 ? `${text.slice(0, 420)}…` : text}”`);
}

async function main() {
  if (!query) {
    console.error('Usage: pnpm expert:search "your query" [--limit 8] [--account <accountId>]');
    process.exit(1);
  }
  const embedder = activeEmbedder();
  if (!embedder) throw new Error("No embedding provider: set VOYAGE_API_KEY or OPENAI_API_KEY in .env.local.");

  const dataDir = path.join(process.cwd(), "data");
  const library = open(path.join(dataDir, "library.db"));
  if (!library) console.log("(no data/library.db yet — run pnpm corpus:fetch && pnpm corpus:build)");
  else {
    const meta = Object.fromEntries((library.prepare("SELECT key, value FROM meta").all() as { key: string; value: string }[]).map((r) => [r.key, r.value]));
    console.log(`Library: ${meta.documents ?? "?"} articles, built ${meta.built_at?.slice(0, 10) ?? "?"} with ${meta.embed_model ?? "?"}. Query embedded with ${embedder.model}.`);
    if (!libraryMatches(library, embedder.model)) console.log("⚠ Different embedding model: rebuild with pnpm corpus:build.");
  }

  const results = accountId
    ? await searchLiterature({ library, uploads: open(path.join(dataDir, "ergoai.db"))!, accountId }, query, { embedder, limit })
    : await searchLibrary(library, query, { embedder, limit });

  console.log(`\n${results.length} passage(s) for “${query}”:`);
  results.forEach(print);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
