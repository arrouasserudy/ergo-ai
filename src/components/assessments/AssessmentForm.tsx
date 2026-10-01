"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useI18n } from "@/i18n/client";
import { getDefinition } from "@/lib/assessments/registry";
import { mostTickedLevel } from "@/lib/assessments/scoring";
import type { AssessmentAnswers, AssessmentSection, LevelItem, RatingChoice, RatingItem } from "@/lib/assessments/types";

export type AnswersChange = (change: (prev: AssessmentAnswers) => AssessmentAnswers) => void;

/** `preview`: the blank test from the catalog, every choice shown, nothing to answer. */
type Mode = "fill" | "readonly" | "print" | "preview";

type Props = {
  /** The definition is looked up here: it holds a function, which a server page cannot pass. */
  definitionId: string;
  answers: AssessmentAnswers;
  onChange?: AnswersChange;
  mode?: Mode;
  /** Items left unanswered, highlighted after a failed submit. */
  missing?: string[];
  /** Keeps element ids unique when two forms share a page. */
  idPrefix?: string;
};

const withValue = (prev: AssessmentAnswers, id: string, value: number | undefined): AssessmentAnswers => {
  const values = { ...prev.values };
  if (value === undefined) delete values[id];
  else values[id] = value;
  return { ...prev, values };
};

/**
 * A test's items, to fill in, read, print or preview blank. Test content is in the test's own
 * language (and direction); the few app words around it follow the app.
 */
export function AssessmentForm({ definitionId, answers, onChange, mode = "fill", missing = [], idPrefix = "test" }: Props) {
  const { t, dir: appDir } = useI18n();
  const a = t.assessments;
  const definition = getDefinition(definitionId)!;
  const print = mode === "print";
  const dir = definition.language === "he" ? "rtl" : "ltr";

  return (
    <div className={clsx(print ? "space-y-5" : "space-y-8")}>
      {mode === "fill" && definition.sections.some((s) => s.items.some((i) => i.kind === "rating")) && (
        <p className="hidden text-[12px] text-ink-muted md:block">{a.keyboardHint}</p>
      )}
      {definition.sections.map((section) => (
        <section key={section.id} dir={dir} lang={definition.language} className={clsx(print ? "space-y-2 break-inside-avoid-page" : "space-y-3")}>
          <header className={clsx(!print && "border-b border-line pb-2")}>
            <h3 className={clsx("font-semibold tracking-tight", print ? "text-[12pt]" : "text-[17px]")}>{section.title}</h3>
          </header>
          {section.scale ? (
            <RatingTable section={section} scale={section.scale} answers={answers} onChange={onChange} mode={mode} missing={missing} idPrefix={idPrefix} />
          ) : (
            <div className="space-y-4">
              {section.items.map((item) =>
                item.kind === "level" ? (
                  <LevelCard key={item.id} item={item} answers={answers} onChange={onChange} mode={mode} invalid={missing.includes(item.id)} idPrefix={idPrefix} />
                ) : null,
              )}
            </div>
          )}
          {section.note && <p className="text-[12px] text-ink-muted">{section.note}</p>}
          {section.comments && mode === "preview" && (
            <div className="space-y-1">
              <span dir={appDir} className="text-[12px] font-medium text-ink-soft">{a.comments}</span>
              <div aria-hidden className="h-14 rounded-xl border border-dashed border-line-strong" />
            </div>
          )}
          {section.comments && (mode === "fill" || (mode !== "preview" && answers.comments[section.id])) && (
            <label className="block space-y-1">
              <span dir={appDir} className="text-[12px] font-medium text-ink-soft">{a.comments}</span>
              {mode === "fill" ? (
                <textarea
                  dir="auto"
                  rows={2}
                  maxLength={2000}
                  value={answers.comments[section.id] ?? ""}
                  onChange={(e) => {
                    const text = e.target.value;
                    onChange?.((prev) => {
                      const comments = { ...prev.comments };
                      if (text) comments[section.id] = text;
                      else delete comments[section.id];
                      return { ...prev, comments };
                    });
                  }}
                  className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              ) : (
                <p dir="auto" className="text-[13px] whitespace-pre-line text-ink-soft">
                  {answers.comments[section.id]}
                </p>
              )}
            </label>
          )}
        </section>
      ))}
    </div>
  );
}

type RatingTableProps = {
  section: AssessmentSection;
  scale: RatingChoice[];
  answers: AssessmentAnswers;
  onChange?: AnswersChange;
  mode: Mode;
  missing: string[];
  idPrefix: string;
};

/** Rating items as on the paper form: one row per item, one column per answer. */
function RatingTable({ section, scale, answers, onChange, mode, missing, idPrefix }: RatingTableProps) {
  const fill = mode === "fill";
  const items = section.items.filter((i): i is RatingItem => i.kind === "rating");
  const rowId = (item: RatingItem) => `${idPrefix}-${item.id}`;

  // Typing an answer's value picks it and moves on (across sections), to transcribe a paper form quickly.
  const onKeyDown = (item: RatingItem) => (e: KeyboardEvent<HTMLElement>) => {
    const choice = scale.find((c) => String(c.value) === e.key);
    const move = (step: number) => {
      const rows = [...document.querySelectorAll<HTMLElement>("[data-rating-row]")];
      rows[rows.indexOf(e.currentTarget) + step]?.focus();
    };
    if (choice) {
      e.preventDefault();
      onChange?.((prev) => withValue(prev, item.id, choice.value));
      move(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      onChange?.((prev) => withValue(prev, item.id, undefined));
    }
  };

  return (
    <>
      {section.lead && <p className="text-[13px] font-medium text-ink-soft">{section.lead}</p>}
      <div className={clsx(!fill && "overflow-x-auto")}>
        <table className="w-full border-collapse text-[13.5px]">
          <thead className={clsx(fill && "hidden md:table-header-group")}>
            <tr className="border-b border-line">
              <th className="w-8" />
              <th />
              {scale.map((c) => (
                <th key={c.value} scope="col" className="w-16 px-1 pb-1.5 text-center align-bottom text-[11px] leading-tight font-medium text-ink-muted">
                  {c.label}
                  <span className="block text-[12px] text-ink">{c.value}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => {
              const value = answers.values[item.id];
              const invalid = missing.includes(item.id) && value === undefined;
              return (
                <tr
                  key={item.id}
                  id={rowId(item)}
                  tabIndex={fill ? 0 : undefined}
                  data-rating-row={fill || undefined}
                  onKeyDown={fill ? onKeyDown(item) : undefined}
                  className={clsx(
                    fill && "flex flex-col gap-2 py-3 outline-none focus-visible:bg-tint/60 md:table-row md:py-0",
                    invalid && "bg-warn/40",
                  )}
                >
                  <td className="hidden w-8 py-2 align-top text-[12px] text-ink-muted tabular-nums md:table-cell">{item.number}</td>
                  <td className="py-2 pe-3 align-top">
                    <span className="me-1.5 text-[12px] text-ink-muted tabular-nums md:hidden">{item.number}</span>
                    {item.text}
                  </td>
                  {fill ? (
                    <>
                      {/* Phones: labeled chips under the text. */}
                      <td className="flex flex-wrap gap-1.5 md:hidden">
                        {scale.map((c) => (
                          <label
                            key={c.value}
                            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-2.5 text-[12.5px] has-checked:border-primary has-checked:bg-tint has-checked:text-tint-ink"
                          >
                            <input
                              type="radio"
                              name={`${rowId(item)}-m`}
                              checked={value === c.value}
                              onChange={() => onChange?.((prev) => withValue(prev, item.id, c.value))}
                              className="accent-primary"
                            />
                            {c.label}
                          </label>
                        ))}
                      </td>
                      {scale.map((c) => (
                        <td key={c.value} className="hidden px-1 text-center md:table-cell">
                          <input
                            type="radio"
                            tabIndex={-1}
                            name={`${rowId(item)}-t`}
                            aria-label={`${item.number}: ${c.label}`}
                            checked={value === c.value}
                            onChange={() => onChange?.((prev) => withValue(prev, item.id, c.value))}
                            className="size-5 cursor-pointer accent-primary"
                          />
                        </td>
                      ))}
                    </>
                  ) : (
                    scale.map((c) => (
                      <td key={c.value} className="w-16 px-1 text-center align-top">
                        {mode === "preview" ? (
                          <span aria-hidden className="mx-auto mt-2 block size-4 rounded-full border border-line-strong" />
                        ) : (
                          value === c.value && <Check className="mx-auto mt-2 size-4" aria-label={c.label} />
                        )}
                      </td>
                    ))
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

type LevelCardProps = { item: LevelItem; answers: AssessmentAnswers; onChange?: AnswersChange; mode: Mode; invalid: boolean; idPrefix: string };

/** A factor: behaviors to tick at each age level, then the level retained (the most ticked is suggested). */
function LevelCard({ item, answers, onChange, mode, invalid, idPrefix }: LevelCardProps) {
  // App words (not the test's) keep the app's direction inside a test written in another script.
  const { t, dir: appDir } = useI18n();
  const a = t.assessments;
  const fill = mode === "fill";
  const preview = mode === "preview";
  const ticked = answers.ticks[item.id] ?? [];
  const value = answers.values[item.id];
  const suggested = mostTickedLevel(item.levels, ticked);

  const toggle = (descriptorId: string, on: boolean) =>
    onChange?.((prev) => {
      const before = prev.ticks[item.id] ?? [];
      const after = on ? [...before, descriptorId] : before.filter((d) => d !== descriptorId);
      const ticks = { ...prev.ticks };
      if (after.length) ticks[item.id] = after;
      else delete ticks[item.id];
      // The suggestion follows the ticks until the therapist picks another level.
      const current = prev.values[item.id];
      const wasSuggested = current === undefined || current === mostTickedLevel(item.levels, before);
      const next = { ...prev, ticks };
      return wasSuggested ? withValue(next, item.id, mostTickedLevel(item.levels, after) ?? undefined) : next;
    });

  return (
    <div id={`${idPrefix}-${item.id}`} className={clsx("rounded-xl border p-3", invalid ? "border-danger" : "border-line", mode === "print" && "break-inside-avoid")}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[15px] font-medium">{item.text}</h4>
        {ticked.length > 0 && <span dir={appDir} className="text-[12px] text-ink-muted">{a.ticked(ticked.length)}</span>}
      </div>
      <div className={clsx("grid gap-2", mode === "print" ? "grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6")}>
        {item.levels.map((level) => (
          <div key={level.value} className={clsx("rounded-md p-2", value === level.value ? "bg-tint" : "bg-surface-muted")}>
            <p className="mb-1 text-[11.5px] font-medium text-ink-muted">{level.label}</p>
            {level.descriptors.length === 0 ? (
              <p className="text-[12px] text-ink-muted">—</p>
            ) : (
              <ul className="space-y-1">
                {level.descriptors.map((d) => (
                  <li key={d.id}>
                    <label className={clsx("flex items-start gap-2 text-[12.5px] leading-snug", fill && "cursor-pointer")}>
                      {preview ? (
                        <span aria-hidden className="mt-0.5 size-4 shrink-0 rounded-sm border border-line-strong bg-surface" />
                      ) : (
                        <input
                          type="checkbox"
                          disabled={!fill}
                          checked={ticked.includes(d.id)}
                          onChange={(e) => toggle(d.id, e.target.checked)}
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                        />
                      )}
                      {d.text}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <fieldset className="mt-3 flex flex-wrap items-center gap-1.5">
        <legend dir={appDir} className="me-2 mb-1 text-[12px] font-medium text-ink-soft sm:float-start sm:mb-0">{a.chosenLevel}</legend>
        {preview
          ? item.levels.map((level) => (
              <span key={level.value} className="flex min-h-9 items-center rounded-xl border border-line-strong px-2.5 text-[13px] text-ink-soft">
                {level.value}
              </span>
            ))
          : item.levels.map((level) => (
              <label
                key={level.value}
                className={clsx(
                  "flex min-h-9 items-center gap-1.5 rounded-xl border border-line-strong px-2.5 text-[13px] has-checked:border-primary has-checked:bg-tint has-checked:text-tint-ink",
                  fill ? "cursor-pointer" : "has-[:not(:checked)]:hidden",
                )}
              >
                <input
                  type="radio"
                  disabled={!fill}
                  name={`${idPrefix}-${item.id}-level`}
                  checked={value === level.value}
                  onChange={() => onChange?.((prev) => withValue(prev, item.id, level.value))}
                  className="accent-primary"
                />
                {level.value}
                {fill && suggested === level.value && (
                  <span dir={appDir} className="text-[11px] text-ink-muted">
                    ({a.suggested})
                  </span>
                )}
              </label>
            ))}
        {!fill && !preview && value === undefined && <span className="text-[13px] text-ink-muted">—</span>}
      </fieldset>
    </div>
  );
}
