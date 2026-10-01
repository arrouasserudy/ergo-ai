import "server-only";
import type { BetaToolResultContentBlockParam } from "@anthropic-ai/sdk/resources/beta";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "@/db";
import { openLibrary } from "@/db/library";
import { searchLiterature, type Passage } from "./retrieval";
import { activeEmbedder } from "./embeddings";
import { PASSAGES_PER_SEARCH, SEARCH_BUDGET_SPENT, searchBudget } from "./search-budget";

export const SEARCH_UNAVAILABLE =
  "The literature search is unavailable right now. Say so, and answer only from general clinical reasoning, clearly flagged as such.";

/** Citation title: "Author A, Author B (2024). Title — Section · CC BY". */
export function citationTitle(p: Passage): string {
  if (p.license === "cabinet") return [p.title, p.section].filter(Boolean).join(" — ");
  const who = [p.authors, p.year ? `(${p.year})` : ""].filter(Boolean).join(" ");
  return `${who ? `${who}. ` : ""}${p.title} — ${p.section} · ${p.license}`;
}

/** One search_result block per passage; citations enabled on all (the API requires all or none). */
export function toSearchResults(passages: Passage[]): BetaToolResultContentBlockParam[] {
  if (passages.length === 0) return [{ type: "text", text: "No relevant passages found in the library for this query." }];
  return passages.map((p) => ({
    type: "search_result" as const,
    // The URL doubles as a stable identifier; the fragment keeps passages distinct.
    source: `${p.url}#${p.id}`,
    title: citationTitle(p),
    content: [{ type: "text" as const, text: p.text }],
    citations: { enabled: true },
  }));
}

/** Runs a literature search for a cabinet; null when no embedding provider is configured. */
export async function runSearch(accountId: string, query: string): Promise<Passage[] | null> {
  const embedder = activeEmbedder();
  if (!embedder) return null;
  const uploads = (db as unknown as { $client: import("better-sqlite3").Database }).$client;
  return searchLiterature({ library: openLibrary(), uploads, accountId }, query, { embedder, limit: PASSAGES_PER_SEARCH });
}

export const SEARCH_TOOL_DESCRIPTION =
  "Search the pediatric occupational therapy library (open-access research articles, plus documents uploaded by the cabinet) and return the most relevant passages. " +
  "Write the query in English, as a focused description of the topic (e.g. 'weighted vest attention autistic children classroom'). " +
  "Search again with a different angle if the first results are not relevant.";

export const SEARCH_QUERY_DESCRIPTION = "English search query, no names or identifying details";

/**
 * The literature search tool for Claude (search_result blocks, native citations).
 * `onSearch` lets the chat route show "Recherche : …" while it runs. One tool per
 * answer: beyond the search budget, calls get a "budget spent" result.
 */
export function searchLiteratureTool(accountId: string, onSearch: (query: string) => void) {
  const budget = searchBudget();
  return betaZodTool({
    name: "search_literature",
    description: SEARCH_TOOL_DESCRIPTION,
    inputSchema: z.object({
      query: z.string().min(3).max(300).describe(SEARCH_QUERY_DESCRIPTION),
    }),
    run: async ({ query }) => {
      if (!budget.take()) return [{ type: "text" as const, text: SEARCH_BUDGET_SPENT }];
      onSearch(query);
      try {
        const passages = await runSearch(accountId, query);
        return passages ? toSearchResults(passages) : [{ type: "text" as const, text: SEARCH_UNAVAILABLE }];
      } catch (err) {
        console.error("[expert] search failed", err);
        return [{ type: "text" as const, text: SEARCH_UNAVAILABLE }];
      }
    },
  });
}
