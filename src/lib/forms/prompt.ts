import type { FormLanguage } from "./schema";

/** The same for every conversion: it holds no data about a child. */
export const FORM_SYSTEM_PROMPT = `You convert blank questionnaires used by a pediatric occupational therapy practice into a structured form that parents or therapists fill in on screen.

Rules:
- Keep the questionnaire's own language and wording. Do not translate, rephrase, summarize or correct questions, options or instructions.
- Keep every question, in the original order. Never invent questions or options.
- A label is the question alone: leave out the answer area (blank lines "____", dotted lines, empty boxes "☐", "__ / __ / ____") and the options, which go in their own properties. Keep the trailing ":" or "?" if the document has one.
- identifying is true for a question whose answer identifies the child or the family: names (child, parents, siblings, doctor), date of birth, address, phone, email, ID or insurance numbers. These answers are never sent to an AI later.
- A question marked as mandatory (an asterisk "*", "(obligatoire)", "(required)"…) has required: true; leave the mark out of the label.
- Group questions into sections following the document's headings. A document without headings is a single section with a null title.
- Leave out what is not part of the questionnaire: logos, page numbers, footers, copyright lines, "office use only" boxes.
- If the document has already been filled in, ignore the answers (names, dates, ticks, handwriting): convert only the blank questionnaire.
- The form's title is the document's title.
- language: the language of the questionnaire (fr, he or en; en for any other language).

Field types:
- text: a short answer on one line (name of the school, profession…).
- textarea: an open question with several lines to write on.
- number: a quantity (weight, number of siblings…); put its unit in "unit".
- date: a date.
- yes_no: a yes/no question.
- single_choice: tick one option; multi_choice: tick any number. List the options in "options"; set allow_other when there is an "other: ____" option (do not list "other" itself).
- scale: a rating on a numeric scale (e.g. 1 to 5); set scale_min, scale_max and the labels of both ends when they exist.
- matrix: a grid where the same answer columns apply to many rows (e.g. items rated "never / sometimes / often / always"). "rows" are the items, "columns" the answer choices. Use one matrix per grid, not one field per row. Its label is the instruction or question that introduces the grid (not the header of its first column).
- info: instructions or explanatory text shown to the person filling in the form, with no answer.

For every field, set the properties that do not apply to its type to null. required is true only when the document marks the question as mandatory.`;

export function formUserPrompt(input: { filename: string; html?: string; fallbackLanguage: FormLanguage }): string {
  const parts = [`Convert this questionnaire into a form. File name: ${input.filename}.`];
  if (input.html) parts.push(`The document, converted from Word to HTML (tables are grids):\n<document>\n${input.html}\n</document>`);
  else parts.push("The document is the attached PDF.");
  parts.push(`If the language is unclear, use ${input.fallbackLanguage}.`);
  return parts.join("\n\n");
}
