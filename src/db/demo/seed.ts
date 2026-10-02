/**
 * Inserts one demo cabinet (a `DemoCabinet` from fr.ts, he.ts, en.ts): deletes the account
 * by its fixed id (cascades) and recreates it with every row derived from the spec.
 */
import { createHash } from "node:crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { ageAtTest } from "../../lib/assessments/registry";
import { ensureBuiltinForms } from "../../lib/forms/builtin";
import { dueDateFor, inYear, schoolYearStartDate } from "../../lib/forms/deadlines";
import { normalizeForm } from "../../lib/forms/normalize";
import type { FormSchema } from "../../lib/forms/schema";
import { deriveReportStatus, wasEdited } from "../../lib/reports/status";
import { db } from "../index";
import {
  accounts,
  assessments,
  authCredentials,
  childEvents,
  childForms,
  children,
  episodes,
  formTemplates,
  reports,
  reportVariants,
  styleExamples,
  therapists,
  type ReportRecipient,
  type ReportSection,
} from "../schema";
import { addDays, at, DAY_MS, day, demoId, fillForm, plus, sqlTimestamp, TODAY, workdayOf, type DemoCabinet } from "./kit";

const MODEL = "claude-sonnet-5";
const SHARE_DAYS = 30;

export type SeedResult = { names: string[]; counts: Record<string, number>; scores: string[] };

export async function seedCabinet(cabinet: DemoCabinet, password: string): Promise<SeedResult> {
  const { accountId, therapistId, email } = cabinet.ids;
  const id = (key: string) => demoId(accountId, key);
  const tokenHash = (key: string) => createHash("sha256").update(`demo-link:${id(key)}`).digest("hex");
  const wd = (n: number) => workdayOf(day(n), cabinet.weekend);

  const taken = db.select({ accountId: therapists.accountId }).from(therapists).where(eq(therapists.email, email)).get();
  if (taken && taken.accountId !== accountId) throw new Error(`${email} already belongs to another account (${taken.accountId}).`);

  const specs = cabinet.children();
  const passwordHash = await hashPassword(password);
  const oldest = specs.map((c) => c.child.followUpStart!).sort()[0];
  const accountCreated = at(addDays(oldest, -20), "09:00");

  // School-year deadlines of the cabinet's forms, relative to today.
  const { schoolYearStart } = cabinet.account;
  const cycle = schoolYearStartDate(schoolYearStart, TODAY).slice(0, 4);
  const previousCycle = String(Number(cycle) - 1);
  const deadlines = new Map(cabinet.templates.filter((t) => t.deadlineInDays !== undefined).map((t) => [t.key, day(t.deadlineInDays!).slice(5)]));
  const dueThisYear = (deadline: string) => dueDateFor(deadline, schoolYearStart, TODAY);
  const duePreviousYear = (deadline: string) => inYear(deadline, Number(dueThisYear(deadline).slice(0, 4)) - 1);
  for (const t of cabinet.templates) {
    if (t.deadlineInDays !== undefined && dueThisYear(deadlines.get(t.key)!) !== day(t.deadlineInDays)) {
      console.warn(`Note (${cabinet.key}): today is close to the start of the school year; the deadline of "${t.key}" falls in another school year.`);
    }
  }

  const counts = { episodes: 0, reports: 0, variants: 0, styleExamples: 0, forms: 0, tests: 0, events: 0 };
  const scores: string[] = [];

  db.transaction((tx) => {
    // Cascades to therapists, credentials, sessions, children and everything below them.
    tx.delete(accounts).where(eq(accounts.id, accountId)).run();
    tx.insert(accounts)
      .values({ id: accountId, ...cabinet.account, deadlineWarnDays: 14, createdAt: accountCreated, updatedAt: accountCreated })
      .run();
    tx.insert(therapists)
      .values({ id: therapistId, name: cabinet.therapistName, email, emailVerified: false, accountId, role: "owner", createdAt: accountCreated, updatedAt: accountCreated })
      .run();
    // Same shape as createTherapist() (lib/therapists.ts): a "credential" login whose accountId is the user id.
    tx.insert(authCredentials)
      .values({ id: id("credential"), userId: therapistId, accountId: therapistId, providerId: "credential", password: passwordHash, createdAt: accountCreated, updatedAt: accountCreated })
      .run();
  });

  // Built-in forms (Hebrew) as every cabinet has them; archived where the cabinet works in another language.
  ensureBuiltinForms(db, [accountId]);
  db.update(formTemplates)
    .set({ createdAt: accountCreated, updatedAt: accountCreated, ...(cabinet.builtinForms === "archive" ? { status: "archived" as const } : {}) })
    .where(and(eq(formTemplates.accountId, accountId), isNotNull(formTemplates.builtinKey)))
    .run();
  const templates = new Map<string, { id: string; schema: FormSchema }>();
  if (cabinet.builtinForms === "use") {
    for (const t of db.select().from(formTemplates).where(eq(formTemplates.accountId, accountId)).all()) templates.set(t.builtinKey!, { id: t.id, schema: t.schema });
  }

  db.transaction((tx) => {
    for (const t of cabinet.templates) {
      const schema = normalizeForm(t.source, t.source.title, cabinet.language);
      const created = at(day(-t.createdDaysAgo), "21:10");
      const templateId = id(`template:${t.key}`);
      tx.insert(formTemplates)
        .values({
          id: templateId,
          accountId,
          createdBy: therapistId,
          title: schema.title,
          sourceFilename: t.file,
          sourceKind: t.kind,
          schema,
          status: "published",
          autoAssign: t.autoAssign,
          deadline: deadlines.get(t.key) ?? null,
          model: MODEL,
          inputTokens: t.tokens[0],
          outputTokens: t.tokens[1],
          generatedAt: created,
          createdAt: created,
          updatedAt: plus(created, 25),
        })
        .run();
      templates.set(t.key, { id: templateId, schema });
    }

    for (const spec of specs) {
      const childId = id(`child:${spec.key}`);
      const name = spec.child.name;
      const first = name.split(" ")[0];
      tx.insert(children)
        .values({ ...spec.child, id: childId, accountId, createdBy: therapistId, status: "active", updatedAt: sqlTimestamp(at(day(-2), "18:00")) })
        .run();

      spec.episodes.forEach((e, i) => {
        const startedAt = at(e.school ? wd(-e.at[0]) : day(-e.at[0]), e.at[1]);
        const endedAt = plus(startedAt, e.minutes);
        tx.insert(episodes)
          .values({
            id: id(`${spec.key}:episode:${i}`),
            accountId,
            childId,
            recordedBy: therapistId,
            kind: e.kind,
            status: "closed",
            situation: e.situation ?? null,
            startedAt,
            endedAt,
            antecedent: e.antecedent,
            behavior: e.behavior,
            causes: e.causes,
            helped: e.helped,
            notes: e.notes ?? null,
            createdAt: startedAt,
            updatedAt: endedAt,
          })
          .run();
        counts.episodes++;
      });

      const formIds = new Map<string, string>();
      for (const f of spec.forms) {
        const template = templates.get(f.template) ?? missing(`template ${f.template} (${cabinet.key})`);
        const formId = id(`${spec.key}:form:${f.key}`);
        formIds.set(f.key, formId);
        const tmpl = cabinet.templates.find((c) => c.key === f.template);
        const deadline = deadlines.get(f.template) ?? null;
        const yearly =
          deadline && f.cycle
            ? f.cycle === "current"
              ? { dueDate: dueThisYear(deadline), cycle }
              : { dueDate: duePreviousYear(deadline), cycle: previousCycle }
            : { dueDate: null, cycle: tmpl?.autoAssign ? "once" : null };
        const created = at(f.created, "08:30");
        const sentAt = f.sent ? at(f.sent, "08:45") : null;
        const status = f.submitted ? "submitted" : sentAt ? "sent" : "draft";
        tx.insert(childForms)
          .values({
            id: formId,
            accountId,
            childId,
            templateId: template.id,
            schema: template.schema,
            answers: f.answers ? fillForm(template.schema, f.answers) : {},
            status,
            submittedAt: f.submitted?.at ?? null,
            submittedBy: f.submitted?.by ?? null,
            shareTokenHash: sentAt ? tokenHash(`${spec.key}:form:${f.key}`) : null,
            shareExpiresAt: sentAt ? new Date(sentAt.getTime() + SHARE_DAYS * DAY_MS) : null,
            ...yearly,
            createdAt: created,
            updatedAt: f.submitted?.at ?? sentAt ?? created,
          })
          .run();
        counts.forms++;
      }

      const testIds = new Map<string, string>();
      for (const t of spec.tests) {
        const testId = id(`${spec.key}:test:${t.key}`);
        testIds.set(t.key, testId);
        const created = at(t.testDate, "10:00");
        const completedAt = t.status === "completed" ? at(addDays(t.testDate, t.completedAfterDays ?? 0), "16:30") : null;
        const testScores = t.status === "completed" ? t.definition.score(t.answers, { ageMonths: ageAtTest(spec.child.birthDate ?? null, t.testDate) }) : null;
        const shared = t.status === "sent" || t.by === "parent";
        tx.insert(assessments)
          .values({
            id: testId,
            accountId,
            childId,
            createdBy: therapistId,
            definitionId: t.definition.id,
            definitionVersion: t.definition.version,
            testDate: t.testDate,
            answers: t.answers,
            scores: testScores,
            status: t.status,
            completedAt,
            completedBy: t.status === "completed" ? (t.by ?? "therapist") : null,
            shareTokenHash: shared ? tokenHash(`${spec.key}:test:${t.key}`) : null,
            shareExpiresAt: shared ? new Date(created.getTime() + SHARE_DAYS * DAY_MS) : null,
            createdAt: created,
            updatedAt: completedAt ?? plus(created, 20),
          })
          .run();
        counts.tests++;
        if (testScores) {
          const group = testScores.find((g) => g.id === (t.definition.summaryGroup ?? testScores[0].id)) ?? testScores[0];
          scores.push(
            `  ${name.padEnd(22)} ${t.definition.shortName.padEnd(18)} ${t.testDate}  ${group.rows
              .map((r) => `${r.id}=${r.value}${r.band !== undefined && r.band !== null ? ` (${group.bands?.[r.band]})` : ""}`)
              .join(", ")}`,
          );
        }
      }

      for (const r of spec.reports) {
        const reportId = id(`${spec.key}:report:${r.key}`);
        const fill = (sections: ReportSection[]) =>
          sections.map((sec) => ({ heading: sec.heading, body: sec.body.split("{{child}}").join(name).split("{{first}}").join(first) }));
        const recipients = r.recipients ?? (r.variants.length ? r.variants.map((v) => v.recipient) : (["parents"] as ReportRecipient[]));
        const created = at(r.date, "17:30");
        const variantRows = r.variants.map((v, i) => {
          const generatedAt = plus(created, 12 + i);
          const validatedAt = v.state === "draft" ? null : at(addDays(r.date, 1), "21:15");
          const exportedAt = v.state === "exported" ? plus(validatedAt!, 4) : null;
          const generated = fill(v.generated);
          const sections = v.edited ? fill(v.edited) : generated;
          const tokens = 1400 + generated.reduce((n, sec) => n + sec.body.length, 0) / 3;
          return {
            id: id(`${spec.key}:report:${r.key}:${v.recipient}`),
            reportId,
            accountId,
            recipient: v.recipient,
            generated,
            sections,
            model: MODEL,
            inputTokens: Math.round(tokens * 2.1),
            outputTokens: Math.round(tokens / 2.4),
            generatedAt,
            validatedAt,
            exportedAt,
          };
        });
        const status = deriveReportStatus(recipients, variantRows);
        const updatedAt = new Date(Math.max(created.getTime(), ...variantRows.map((v) => (v.exportedAt ?? v.validatedAt ?? v.generatedAt).getTime())));
        tx.insert(reports)
          .values({
            id: reportId,
            accountId,
            childId,
            authorId: therapistId,
            docType: r.docType,
            sessionDate: r.date,
            notes: r.notes,
            tests: r.tests ?? [],
            recipients,
            language: cabinet.language,
            formIds: (r.forms ?? []).map((k) => formIds.get(k) ?? missing(`form ${k}`)),
            assessmentIds: (r.assessments ?? []).map((k) => testIds.get(k) ?? missing(`test ${k}`)),
            status,
            createdAt: created,
            updatedAt,
          })
          .run();
        counts.reports++;
        for (const row of variantRows) {
          tx.insert(reportVariants).values(row).run();
          counts.variants++;
          // As validateVariant() does: an edited, validated version teaches the therapist's style.
          if (row.validatedAt && wasEdited(row.generated, row.sections)) {
            tx.insert(styleExamples)
              .values({
                id: demoId(accountId, `${row.id}:style`),
                accountId,
                therapistId,
                variantId: row.id,
                recipient: row.recipient,
                docType: r.docType,
                before: row.generated,
                after: row.sections,
                createdAt: row.validatedAt,
              })
              .run();
            counts.styleExamples++;
          }
        }
      }

      spec.events.forEach((e, i) => {
        if (e.report && !spec.reports.some((r) => r.key === e.report)) missing(`report ${e.report} (${spec.key})`);
        const created = at(addDays(e.date, -7) < TODAY ? addDays(e.date, -7) : TODAY, "19:40");
        tx.insert(childEvents)
          .values({
            id: id(`${spec.key}:event:${i}`),
            accountId,
            childId,
            createdBy: therapistId,
            kind: e.kind,
            date: e.date,
            time: e.time ?? null,
            reportId: e.report ? id(`${spec.key}:report:${e.report}`) : null,
            details: e.details ?? null,
            createdAt: created,
            updatedAt: created,
          })
          .run();
        counts.events++;
      });
    }
  });

  return { names: specs.map((c) => c.child.name), counts, scores };
}

function missing(what: string): never {
  throw new Error(`Demo: unknown ${what}`);
}
