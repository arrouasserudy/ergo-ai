"use client";

import clsx from "clsx";
import { Check, CircleAlert, Info, Loader2, Plus, RotateCw, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { deleteReport, generateReport, markExported, saveReport, saveVariant, validateVariant } from "@/app/actions/reports";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FormError } from "@/components/ui/FormError";
import { SaveIndicator, type SaveState } from "@/components/ui/SaveIndicator";
import {
  REPORT_DOC_TYPES,
  REPORT_LANGUAGES,
  type Report,
  type ReportRecipient,
  type ReportSection,
  type ReportVariant,
} from "@/db/schema";
import { LOCALE_NAMES } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { TO_COMPLETE } from "@/lib/reports/prompt";
import { deriveReportStatus, wasEdited } from "@/lib/reports/status";
import type { ReportInput } from "@/lib/validation";
import { Dictation } from "./Dictation";
import { ExportBar } from "./ExportBar";
import { ReportStatusBadge } from "./ReportStatusBadge";

type Variants = Partial<Record<ReportRecipient, ReportVariant>>;

type ReportEditorProps = {
  report: Report;
  variants: ReportVariant[];
  child: { name: string; displayName: string; title: string; referralReason: string };
  exportContext: { accountName: string; letterhead: string | null; therapistName: string; timeZone: string };
  dictationAvailable: boolean;
};

const AUTOSAVE_MS = 700;

export function ReportEditor({ report, variants: initialVariants, child, exportContext, dictationAvailable }: ReportEditorProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const r = t.reports;

  const [data, setData] = useState<ReportInput>({
    docType: report.docType,
    sessionDate: report.sessionDate,
    notes: report.notes,
    tests: report.tests,
    recipients: report.recipients,
    language: report.language,
  });
  const [variants, setVariants] = useState<Variants>(() => Object.fromEntries(initialVariants.map((v) => [v.recipient, v])));
  const [active, setActive] = useState<ReportRecipient>(report.recipients[0] ?? "parents");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [generating, setGenerating] = useState<ReportRecipient[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [validating, setValidating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = useRef(false);
  const variantTimers = useRef<Partial<Record<ReportRecipient, ReturnType<typeof setTimeout>>>>({});

  const update = (patch: Partial<ReportInput>) => {
    dirty.current = true;
    setGenError(null);
    setData((d) => ({ ...d, ...patch }));
  };

  const persist = async (input: ReportInput) => {
    setSaveState("saving");
    try {
      const result = await saveReport(report.id, input);
      setSaveState(result.ok ? "saved" : "error");
      return result.ok;
    } catch {
      setSaveState("error");
      return false;
    }
  };

  // Autosave the notes side shortly after each change.
  useEffect(() => {
    if (!dirty.current) return;
    const id = setTimeout(() => {
      dirty.current = false;
      void persist(data);
    }, AUTOSAVE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const recipients = data.recipients as ReportRecipient[];
  const current = recipients.includes(active) ? active : recipients[0];
  const variant = current ? variants[current] : undefined;
  const missing = recipients.filter((k) => !variants[k]);

  const generate = async (targets: ReportRecipient[]) => {
    setConfirmRegenerate(false);
    setGenError(null);
    if (!data.notes.trim()) {
      setGenError(r.errors.notesRequired);
      return;
    }
    // Generation reads the saved report: save pending notes first.
    if (dirty.current) {
      dirty.current = false;
      if (!(await persist(data))) return;
    }
    targets.forEach((k) => clearTimeout(variantTimers.current[k]));
    setGenerating(targets);
    try {
      const result = await generateReport(report.id, targets);
      if (result.ok) setVariants(Object.fromEntries(result.variants.map((v) => [v.recipient, v])));
      else setGenError(r.errors[result.error] ?? r.errors.generic);
    } catch {
      setGenError(r.errors.generic);
    }
    setGenerating([]);
  };

  const regenerate = () => {
    if (!current) return;
    if (variant && wasEdited(variant.generated, variant.sections) && !confirmRegenerate) setConfirmRegenerate(true);
    else void generate([current]);
  };

  /** Local edit + debounced autosave. Editing un-validates the version. */
  const editSections = (k: ReportRecipient, sections: ReportSection[]) => {
    setVariants((vs) => ({ ...vs, [k]: { ...vs[k]!, sections, validatedAt: null, exportedAt: null } }));
    clearTimeout(variantTimers.current[k]);
    variantTimers.current[k] = setTimeout(async () => {
      setSaveState("saving");
      try {
        const result = await saveVariant(report.id, k, sections);
        setSaveState(result.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, AUTOSAVE_MS);
  };

  const validate = async () => {
    if (!current || !variant) return;
    clearTimeout(variantTimers.current[current]); // the validation saves the text itself
    setValidating(true);
    try {
      const result = await validateVariant(report.id, current, variant.sections);
      if (result.ok && result.variant) setVariants((vs) => ({ ...vs, [current]: result.variant }));
      else setGenError(r.errors.generic);
    } catch {
      setGenError(r.errors.generic);
    }
    setValidating(false);
  };

  const exported = async (k: ReportRecipient) => {
    const result = await markExported(report.id, k).catch(() => null);
    if (result?.ok && result.variant) setVariants((vs) => ({ ...vs, [k]: result.variant }));
  };

  const status = deriveReportStatus(recipients, Object.values(variants));
  const isGenerating = generating.length > 0;
  const hasToComplete = variant?.sections.some((s) => s.body.includes(TO_COMPLETE[data.language]));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Eyebrow>{r.eyebrow(r.docType[data.docType])}</Eyebrow>
            <ReportStatusBadge status={status} />
          </div>
          <h1 className="mt-1 font-serif text-[32px] leading-tight font-medium">{child.title}</h1>
          <p className="mt-1 text-[13px] text-ink-muted">{r.sessionMeta(i18n.date(data.sessionDate), child.referralReason)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SaveIndicator state={saveState} />
          {confirmDelete ? (
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                {t.common.cancel}
              </Button>
              <Button variant="secondary" className="text-danger" onClick={() => deleteReport(report.id)}>
                <Trash2 className="size-4" />
                {r.confirmDelete}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" />
              {r.delete}
            </Button>
          )}
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* 1. Notes */}
        <Card>
          <CardHeader number={1} title={r.notesTitle} action={<span className="text-[12px] text-ink-muted">{r.notesHint}</span>} />
          <div className="space-y-4 px-5 pb-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label={r.docTypeLabel} value={data.docType} onChange={(v) => update({ docType: v as ReportInput["docType"] })}>
                {REPORT_DOC_TYPES.map((k) => (
                  <option key={k} value={k}>
                    {r.docType[k]}
                  </option>
                ))}
              </SelectField>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-medium text-ink-soft">{r.sessionDate}</span>
                <input
                  type="date"
                  value={data.sessionDate}
                  onChange={(e) => e.target.value && update({ sessionDate: e.target.value })}
                  className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              <SelectField label={r.language} value={data.language} onChange={(v) => update({ language: v as ReportInput["language"] })}>
                {REPORT_LANGUAGES.map((k) => (
                  <option key={k} value={k}>
                    {LOCALE_NAMES[k]}
                  </option>
                ))}
              </SelectField>
            </div>

            <Dictation
              language={data.language}
              available={dictationAvailable}
              onText={(text) => update({ notes: data.notes.trim() ? `${data.notes.trimEnd()}\n${text}` : text })}
            />

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-soft">{r.notesLabel}</span>
              <textarea
                dir="auto"
                value={data.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder={r.notesPlaceholder}
                rows={14}
                className="w-full resize-y rounded-lg border border-line-strong bg-surface-muted px-3.5 py-3 text-[14px] leading-relaxed placeholder:text-ink-muted/70 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15 focus:outline-none"
              />
              <span className="text-[12px] text-ink-muted">{r.namesHint}</span>
            </label>

            <TestsEditor tests={data.tests} onChange={(tests) => update({ tests })} />
          </div>
        </Card>

        {/* 2. Generated report */}
        <Card>
          <CardHeader
            number={2}
            title={r.reportTitle}
            action={
              missing.length > 0 ? (
                <Button onClick={() => generate(missing)} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {r.generateAll(missing.length)}
                </Button>
              ) : (
                <Button variant="secondary" onClick={regenerate} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
                  {r.regenerate}
                </Button>
              )
            }
          />
          <div className="space-y-4 px-5 pb-5">
            {/* One generic report (for parents); older reports may still hold one version per recipient. */}
            {recipients.length > 1 && (
              <div role="tablist" className="flex rounded-lg bg-surface-muted p-1">
                {recipients.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={k === current}
                    onClick={() => {
                      setActive(k);
                      setConfirmRegenerate(false);
                    }}
                    className={clsx(
                      "flex h-9 flex-1 items-center justify-center gap-2 rounded-md text-[13.5px] transition-colors",
                      k === current ? "bg-surface font-medium shadow-sm" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    <VariantDot variant={variants[k]} />
                    {r.recipient[k]}
                  </button>
                ))}
              </div>
            )}

            {genError && <FormError message={genError} />}
            {confirmRegenerate && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warn-ink/20 bg-warn px-3 py-2 text-[13px] text-warn-ink">
                <span>{r.confirmRegenerate}</span>
                <span className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRegenerate(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button size="sm" onClick={() => current && generate([current])}>
                    {r.confirm}
                  </Button>
                </span>
              </div>
            )}

            {current && generating.includes(current) ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface-muted text-[13px] text-ink-muted">
                <Loader2 className="size-5 animate-spin" />
                {r.generating}
              </div>
            ) : !variant ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong px-6 text-center">
                <p className="text-[13px] text-ink-muted">{r.notGenerated}</p>
                {current && (
                  <Button variant="secondary" onClick={() => generate([current])} disabled={isGenerating}>
                    <Sparkles className="size-4" />
                    {recipients.length > 1 ? r.generateOne(r.recipient[current]) : r.generateAll(1)}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-1 text-[12px] text-ink-muted">
                  <p>{r.tone[variant.recipient]}</p>
                  {!variant.validatedAt && (
                    <p className="flex gap-1.5">
                      <Info className="mt-0.5 size-3.5 shrink-0" />
                      {r.reviewHint}
                    </p>
                  )}
                  {hasToComplete && (
                    <p className="flex gap-1.5 text-warn-ink">
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                      {r.toComplete}
                    </p>
                  )}
                </div>

                <SectionsEditor sections={variant.sections} dir={data.language === "he" ? "rtl" : "ltr"} onChange={(s) => editSections(variant.recipient, s)} />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-[12.5px] text-ink-muted">
                    {variant.exportedAt
                      ? r.exported(i18n.dateTime(new Date(variant.exportedAt)))
                      : variant.validatedAt
                        ? r.validated(i18n.dateTime(new Date(variant.validatedAt)))
                        : r.validateToExport}
                  </p>
                  {!variant.validatedAt && (
                    <Button onClick={validate} disabled={validating}>
                      {validating ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {r.validate}
                    </Button>
                  )}
                </div>

                <ExportBar
                  nameHint={child.displayName}
                  disabled={!variant.validatedAt}
                  onExported={() => exported(variant.recipient)}
                  input={{
                    language: data.language,
                    timeZone: exportContext.timeZone,
                    docType: data.docType,
                    sessionDate: data.sessionDate,
                    name: child.name,
                    accountName: exportContext.accountName,
                    letterhead: exportContext.letterhead,
                    therapistName: exportContext.therapistName,
                    sections: variant.sections,
                  }}
                />
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium text-ink-soft">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function TestsEditor({ tests, onChange }: { tests: ReportInput["tests"]; onChange: (tests: ReportInput["tests"]) => void }) {
  const r = useI18n().t.reports;
  const set = (i: number, patch: Partial<ReportInput["tests"][number]>) => onChange(tests.map((test, k) => (k === i ? { ...test, ...patch } : test)));
  const input =
    "h-8 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

  return (
    <div className="space-y-2">
      <p className="text-[12.5px] font-medium text-ink-soft">{r.testsLabel}</p>
      {tests.map((test, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted p-2">
          <input dir="auto" value={test.name} onChange={(e) => set(i, { name: e.target.value })} placeholder={r.testName} maxLength={120} className={clsx(input, "w-40")} />
          <input
            dir="auto"
            value={test.results}
            onChange={(e) => set(i, { results: e.target.value })}
            placeholder={r.testResults}
            maxLength={1000}
            className={clsx(input, "min-w-40 flex-1")}
          />
          <button
            type="button"
            onClick={() => onChange(tests.filter((_, k) => k !== i))}
            aria-label={r.removeTest}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...tests, { name: "", results: "" }])}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1 text-[12.5px] text-ink-soft hover:border-primary hover:text-primary"
      >
        <Plus className="size-3.5" />
        {r.addTest}
      </button>
    </div>
  );
}

function SectionsEditor({ sections, dir, onChange }: { sections: ReportSection[]; dir: "ltr" | "rtl"; onChange: (sections: ReportSection[]) => void }) {
  const r = useI18n().t.reports;
  const set = (i: number, patch: Partial<ReportSection>) => onChange(sections.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface-muted p-4" dir={dir}>
      {sections.map((section, i) => (
        <div key={i} className="group space-y-1">
          <div className="flex items-center gap-2">
            <input
              value={section.heading}
              onChange={(e) => set(i, { heading: e.target.value })}
              aria-label={r.sectionHeading}
              placeholder={r.sectionHeading}
              className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-0.5 text-[14px] font-semibold focus:bg-surface focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(sections.filter((_, k) => k !== i))}
              aria-label={r.removeSection}
              title={r.removeSection}
              className="rounded-md p-1 text-ink-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-surface hover:text-ink focus:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <textarea
            value={section.body}
            onChange={(e) => set(i, { body: e.target.value })}
            aria-label={section.heading}
            className="field-sizing-content min-h-16 w-full resize-none rounded-md bg-transparent px-1.5 py-1 text-[14px] leading-relaxed focus:bg-surface focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...sections, { heading: "", body: "" }])}
        className="inline-flex items-center gap-1 px-1.5 text-[12.5px] text-ink-muted hover:text-primary"
      >
        <Plus className="size-3.5" />
        {r.addSection}
      </button>
    </div>
  );
}

function VariantDot({ variant }: { variant?: ReportVariant }) {
  const tone = !variant ? "bg-line-strong" : variant.exportedAt ? "bg-muted-badge-ink" : variant.validatedAt ? "bg-ok-ink" : "bg-warn-ink";
  return <span aria-hidden className={clsx("size-1.5 rounded-full", tone)} />;
}
