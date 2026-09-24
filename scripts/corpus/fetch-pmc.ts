/**
 * Downloads open-access pediatric OT articles from PubMed Central (BioC JSON) into
 * data/corpus/raw/. Already-downloaded articles are skipped, so it can be re-run.
 *
 *   pnpm corpus:fetch                 # 150 per topic
 *   pnpm corpus:fetch --per-topic 6   # small development corpus
 */
import fs from "node:fs";
import path from "node:path";
import { COMMON_FILTER, TOPICS } from "./topics";

const RAW_DIR = path.join(process.cwd(), "data", "corpus", "raw");
const perTopic = Number(process.argv[process.argv.indexOf("--per-topic") + 1]) || 150;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function search(query: string, retmax: number): Promise<string[]> {
  const url = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  url.search = new URLSearchParams({ db: "pmc", term: `${query} AND ${COMMON_FILTER}`, retmode: "json", retmax: String(retmax), sort: "relevance" }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`esearch ${res.status}`);
  const json = (await res.json()) as { esearchresult: { idlist: string[]; count: string } };
  console.log(`  ${json.esearchresult.count} matches, taking ${json.esearchresult.idlist.length}`);
  return json.esearchresult.idlist;
}

async function fetchBioc(pmcId: string): Promise<string | null> {
  const res = await fetch(`https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC${pmcId}/unicode`);
  if (!res.ok) return null;
  const body = await res.text();
  // Articles not (yet) available return a plain-text "[Error] : …" instead of JSON.
  try {
    JSON.parse(body);
    return body;
  } catch {
    return null;
  }
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const ids = new Set<string>();
  for (const topic of TOPICS) {
    console.log(`Topic ${topic.key}`);
    // Ask for more than needed: some articles have no full text in BioC.
    for (const id of await search(topic.query, perTopic)) ids.add(id);
    await sleep(400); // NCBI: max 3 requests/s without an API key
  }

  let saved = 0;
  let skipped = 0;
  let missing = 0;
  for (const id of ids) {
    const file = path.join(RAW_DIR, `PMC${id}.json`);
    if (fs.existsSync(file)) {
      skipped++;
      continue;
    }
    const body = await fetchBioc(id);
    if (body) {
      fs.writeFileSync(file, body);
      saved++;
    } else missing++;
    await sleep(350);
    if ((saved + missing) % 25 === 0) console.log(`  ${saved} saved, ${missing} unavailable…`);
  }
  console.log(`Done: ${ids.size} articles found, ${saved} downloaded, ${skipped} already present, ${missing} unavailable.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
