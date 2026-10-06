/**
 * Smoke test of the Claude subscription provider (needs CLAUDE_CODE_OAUTH_TOKEN):
 * one structured report-style call, then two Amit turns (the second must recall the first).
 *   pnpm tsx --conditions=react-server --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/smoke-claude-code.mts
 */
import { z } from "zod";
import { generateStructured } from "@/lib/reports/generate";
import { runClaudeCode } from "@/lib/expert/providers/claude-code";
import type { StoredMessage } from "@/lib/expert/providers/types";

const structured = await generateStructured("claude-code", {
  schema: z.object({ sections: z.array(z.object({ heading: z.string(), body: z.string() })) }),
  name: "report",
  system: "Write a very short OT progress note for parents, in English, two sections.",
  prompt: "Session notes: {{child}} climbed the ladder alone today; still avoids messy play.",
});
console.log("structured:", structured.model, structured.usage, JSON.stringify(structured.output).slice(0, 300));

const history: StoredMessage[] = [];
for (const prompt of ["Hi, my favourite colour is teal. Just say hello.", "What is my favourite colour?"]) {
  let streamed = "";
  const { newMessages, usage, refused } = await runClaudeCode({
    history,
    prompt,
    locale: "en",
    accountId: "smoke",
    send: (e) => {
      if (e.type === "text") streamed += e.text;
    },
  });
  console.log(`turn: ${JSON.stringify(streamed.slice(0, 200))}`, usage, { refused, stored: newMessages.length });
  history.push(...newMessages);
}

// A clinical question: Amit must call search_literature and cite with [library:id] markers.
const searches: string[] = [];
let parts = 0;
let cited = 0;
const clinical = await runClaudeCode({
  history: [],
  prompt: "Do weighted vests help attention in autistic children in class?",
  locale: "en",
  accountId: "smoke",
  send: (e) => {
    if (e.type === "search") searches.push(e.query);
    if (e.type === "message") {
      parts += e.parts.length;
      cited += e.parts.filter((p) => p.citations.length).length;
    }
  },
});
console.log("clinical:", { searches, parts, citedParts: cited, stored: clinical.newMessages.map((m) => m.role), usage: clinical.usage });
