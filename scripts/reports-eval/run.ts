/**
 * Drafts a report for each evaluation case with the real prompts and model, and
 * writes one Markdown file per case (notes, report, ideas) for an OT to review.
 * With --judge, a second call scores each draft against a rubric.
 *
 *   pnpm reports:eval                       # every case
 *   pnpm reports:eval --lang he --judge     # Hebrew cases, scored
 *   pnpm reports:eval --case he-feeding-1 --out data/reports-eval/try
 *   pnpm reports:eval --case a,b --recipient parents   # several cases, parents version (default: clinical)
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { REPORT_RECIPIENTS, type ReportRecipient } from "@/db/schema";
import { defaultProvider } from "@/lib/expert/providers";
import { generateDraft, generateStructured } from "@/lib/reports/generate";
import { newInsights } from "@/lib/reports/insights";
import { reportSystemPrompt, reportUserPrompt, sectionsToText } from "@/lib/reports/prompt";
import { CASES, type EvalCase } from "./cases";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

const RUBRIC = {
  register: "Wording and register: reads like a senior OT's professional report in the report language (vocabulary, impersonal clinical style, fluent, not translated).",
  faithfulness: "Faithfulness: the report sections hold only facts from the notes, tests and child context (ideas may also draw on the child context); nothing invented, nothing important left out.",
  relevance: "Clinical relevance of the ideas: specific to this child, linked to underlying components, what an experienced OT would actually propose.",
  hedging: "Hypotheses are worded as possibilities, each idea rests on an observation actually in the notes.",
  safety: "No diagnosis or label, medical concerns referred to the doctor, nothing blaming the family.",
} as const;

const judgeSchema = z.object({
  scores: z.array(z.object({ criterion: z.enum(Object.keys(RUBRIC) as [keyof typeof RUBRIC, ...(keyof typeof RUBRIC)[]]), score: z.number(), comment: z.string() })),
  summary: z.string(),
});

const JUDGE_SYSTEM = `You review a report drafted by an AI for a pediatric occupational therapist, from her session notes. Score each criterion from 1 (poor) to 5 (excellent), with a one-sentence comment quoting the text when useful. Be strict: a 5 means a senior OT would send it as is.

Criteria:
${Object.entries(RUBRIC)
  .map(([key, text]) => `- ${key}: ${text}`)
  .join("\n")}`;

function prompts(c: EvalCase, recipient: ReportRecipient) {
  return {
    system: reportSystemPrompt(c.language, c.docType),
    prompt: reportUserPrompt({
      child: c.child,
      docType: c.docType,
      recipient,
      sessionDate: c.sessionDate,
      notes: c.notes,
      tests: c.tests,
      examples: [],
    }),
  };
}

async function main() {
  const lang = flag("--lang");
  const only = flag("--case")?.split(",");
  const recipient = flag("--recipient") ?? "clinical";
  if (!(REPORT_RECIPIENTS as readonly string[]).includes(recipient)) {
    console.error(`Unknown recipient: ${recipient}`);
    process.exit(1);
  }
  const judge = args.includes("--judge");
  const out = flag("--out") ?? path.join("data", "reports-eval", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19));
  const cases = CASES.filter((c) => (!lang || c.language === lang) && (!only || only.includes(c.id)));
  if (cases.length === 0) {
    console.error("No case matches.");
    process.exit(1);
  }
  const provider = defaultProvider();
  if (!provider) {
    console.error("No AI provider configured (ANTHROPIC_API_KEY, CLAUDE_CODE_OAUTH_TOKEN or OPENAI_API_KEY).");
    process.exit(1);
  }
  fs.mkdirSync(out, { recursive: true });
  console.log(`${cases.length} case(s), provider ${provider}, output ${out}`);

  const summary: string[] = [];
  for (const c of cases) {
    const { system, prompt } = prompts(c, recipient as ReportRecipient);
    const started = Date.now();
    try {
      const draft = await generateDraft(provider, system, prompt);
      let n = 0;
      const insights = newInsights(draft.insights, () => `${++n}`);
      const report = sectionsToText(draft.sections);
      const ideas = insights.map((i) => `- **${i.kind}**: ${i.text}\n  - _basis_: ${i.basis}`).join("\n");
      const lines = [
        `# ${c.id} (${c.language}, ${c.docType})`,
        `Model: ${draft.model} · ${draft.usage.input} in / ${draft.usage.output} out tokens · ${Math.round((Date.now() - started) / 1000)} s`,
        `## Notes\n\n\`\`\`\n${c.notes}\n\`\`\``,
        c.tests.length ? `## Tests\n\n${c.tests.map((t) => `- ${t.name}: ${t.results}`).join("\n")}` : "",
        `## Report\n\n${report}`,
        `## Ideas\n\n${ideas || "_none_"}`,
      ];
      let scoreLine = "";
      if (judge) {
        const { output } = await generateStructured(provider, {
          schema: judgeSchema,
          name: "review",
          system: JUDGE_SYSTEM,
          prompt: `<child_context>\nReason for referral: ${c.child.referralReason}\nSchool level: ${c.child.schoolLevel ?? "-"}\nInterests: ${c.child.interests.join(", ") || "-"}\n</child_context>\n\n<notes>\n${c.notes}\n</notes>\n\n<report>\n${report}\n</report>\n\n<ideas>\n${ideas}\n</ideas>`,
        });
        lines.push(`## Judge\n\n${output.scores.map((s) => `- ${s.criterion}: **${s.score}/5**. ${s.comment}`).join("\n")}\n\n${output.summary}`);
        scoreLine = output.scores.map((s) => `${s.criterion}=${s.score}`).join(" ");
      }
      fs.writeFileSync(path.join(out, `${c.id}.md`), lines.filter(Boolean).join("\n\n") + "\n");
      summary.push(`- ${c.id}: ${draft.sections.length} sections, ${insights.length} ideas ${scoreLine}`);
      console.log(`✓ ${c.id} ${scoreLine}`);
    } catch (err) {
      summary.push(`- ${c.id}: FAILED (${err instanceof Error ? err.message : String(err)})`);
      console.error(`✗ ${c.id}`, err);
    }
  }
  fs.writeFileSync(path.join(out, "README.md"), `# Report eval\n\n${summary.join("\n")}\n`);
}

void main();
