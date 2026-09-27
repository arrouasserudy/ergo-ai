import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/** Auth timestamps are stored as epoch milliseconds, as Better Auth expects Date values. */
const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

/** A practice (cabinet). Owns children; therapists belong to exactly one account. */
export const accounts = sqliteTable("accounts", {
  id: id(),
  name: text("name").notNull(),
  /** Letterhead printed at the top of exported reports (address, phone, registration number…). */
  letterhead: text("letterhead"),
  ...timestamps(),
});

export const THERAPIST_ROLES = ["owner", "member"] as const;
export type TherapistRole = (typeof THERAPIST_ROLES)[number];

/** Better Auth's `user` model. */
export const therapists = sqliteTable(
  "therapists",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    role: text("role", { enum: THERAPIST_ROLES }).notNull().default("member"),
    ...timestamps(),
  },
  (table) => [index("therapists_account_id_idx").on(table.accountId)],
);

/** Better Auth's `session` model. */
export const sessions = sqliteTable(
  "sessions",
  {
    id: id(),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => therapists.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

/**
 * Better Auth's `account` model (login credentials per provider), renamed
 * to avoid confusion with practice `accounts`. Holds the password hash.
 */
export const authCredentials = sqliteTable(
  "auth_credentials",
  {
    id: id(),
    accountId: text("account_id").notNull(), // provider-side id, not a practice account
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => therapists.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps(),
  },
  (table) => [index("auth_credentials_user_id_idx").on(table.userId)],
);

/** Better Auth's `verification` model. */
export const verifications = sqliteTable("verifications", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps(),
});

export type Account = typeof accounts.$inferSelect;
export type Therapist = typeof therapists.$inferSelect;

export const CHILD_STATUSES = ["active", "archived"] as const;
export type ChildStatus = (typeof CHILD_STATUSES)[number];

/**
 * A child followed by the therapist. `name` is whatever the therapist types (full
 * name or initials); it is never sent to an AI model.
 */
export const children = sqliteTable(
  "children",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdBy: text("created_by").references(() => therapists.id, { onDelete: "set null" }),

    // Identity
    name: text("name").notNull(),
    birthDate: text("birth_date"), // ISO date (YYYY-MM-DD)
    referralReason: text("referral_reason").notNull(),
    schoolLevel: text("school_level"),
    followUpStart: text("follow_up_start"), // ISO date
    status: text("status", { enum: CHILD_STATUSES }).notNull().default("active"),

    // Medical and family history
    medicalHistory: text("medical_history"),
    birthHistory: text("birth_history"),
    surgicalHistory: text("surgical_history"),
    geneticDiagnoses: text("genetic_diagnoses"),
    familyHistory: text("family_history"),
    familyComposition: text("family_composition"),
    siblingsCount: integer("siblings_count"),
    otherInfo: text("other_info"),

    // Sensory profile and triggers
    knownTriggers: text("known_triggers"),
    hyperSensitivities: text("hyper_sensitivities", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    hypoReactivities: text("hypo_reactivities", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    seeksDeepPressure: integer("seeks_deep_pressure", { mode: "boolean" }).notNull().default(false),
    backgroundFactors: text("background_factors", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    warningSigns: text("warning_signs"),
    calmingStrategies: text("calming_strategies", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    interests: text("interests", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),

    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("children_account_id_idx").on(table.accountId)],
);

export type Child = typeof children.$inferSelect;
export type NewChild = typeof children.$inferInsert;

export const EPISODE_KINDS = ["crisis", "difficulty"] as const;
export type EpisodeKind = (typeof EPISODE_KINDS)[number];

export const EPISODE_STATUSES = ["open", "closed"] as const;
export type EpisodeStatus = (typeof EPISODE_STATUSES)[number];

/**
 * A crisis, or an everyday difficulty (refusing to eat, to enter a room…),
 * recorded as an A-B-C entry: what came before, what happened, what helped.
 * The checked causes feed the child's history and reorder future check-lists.
 */
export const episodes = sqliteTable(
  "episodes",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    recordedBy: text("recorded_by").references(() => therapists.id, { onDelete: "set null" }),

    kind: text("kind", { enum: EPISODE_KINDS }).notNull(),
    status: text("status", { enum: EPISODE_STATUSES }).notNull().default("open"),
    /** Everyday situation key (see lib/episode-catalog.ts) or free text. Required for difficulties. */
    situation: text("situation"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),

    antecedent: text("antecedent"), // A: what happened just before
    behavior: text("behavior"), // B: what the child did
    causes: text("causes", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    helped: text("helped", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`), // C: what helped
    notes: text("notes"),

    ...timestamps(),
  },
  (table) => [
    index("episodes_child_started_idx").on(table.childId, table.startedAt),
    index("episodes_account_started_idx").on(table.accountId, table.startedAt),
  ],
);

export type Episode = typeof episodes.$inferSelect;

/**
 * A conversation with the "collègue expert". Private to the therapist who started it.
 * An optional child gives the assistant pseudonymized context (never a name).
 */
export const conversations = sqliteTable(
  "conversations",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    therapistId: text("therapist_id")
      .notNull()
      .references(() => therapists.id, { onDelete: "cascade" }),
    childId: text("child_id").references(() => children.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    /** Chat provider; history is stored in that provider's message format, so it can't change. */
    provider: text("provider", { enum: ["anthropic", "openai"] }).notNull().default("anthropic"),
    ...timestamps(),
  },
  (table) => [index("conversations_therapist_updated_idx").on(table.therapistId, table.updatedAt)],
);

export const CHAT_ROLES = ["user", "assistant", "tool"] as const;

/**
 * One API message, stored exactly as sent/received (content blocks as JSON), so the
 * history can be replayed unchanged: thinking blocks, tool calls and tool results
 * (search results) included.
 */
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    /** Scoping + daily limit without a join. */
    accountId: text("account_id").notNull(),
    role: text("role", { enum: CHAT_ROLES }).notNull(),
    content: text("content", { mode: "json" }).$type<unknown>().notNull(),
    /** True for the user's own typed message (not a tool-result turn). */
    isPrompt: integer("is_prompt", { mode: "boolean" }).notNull().default(false),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("chat_messages_conversation_idx").on(table.conversationId, table.createdAt),
    index("chat_messages_account_created_idx").on(table.accountId, table.createdAt),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;

export const DOCUMENT_STATUSES = ["processing", "ready", "failed"] as const;

/**
 * A PDF uploaded by a cabinet to the expert's library (course notes, guidelines…).
 * Searchable only within that cabinet. Full-text and vector indexes are virtual
 * tables created in a custom migration (document_chunks_fts, document_chunks_vec).
 */
export const documents = sqliteTable(
  "documents",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    uploadedBy: text("uploaded_by").references(() => therapists.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    filename: text("filename").notNull(),
    pages: integer("pages"),
    /** Embedding model of this document's vectors; search ignores other models. */
    embedModel: text("embed_model"),
    status: text("status", { enum: DOCUMENT_STATUSES }).notNull().default("processing"),
    ...timestamps(),
  },
  (table) => [index("documents_account_idx").on(table.accountId)],
);

export const documentChunks = sqliteTable(
  "document_chunks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    page: integer("page"),
    ordinal: integer("ordinal").notNull(),
    text: text("text").notNull(),
  },
  (table) => [index("document_chunks_document_idx").on(table.documentId)],
);

export type UploadedDocument = typeof documents.$inferSelect;

export const REPORT_DOC_TYPES = ["follow_up", "initial_assessment", "letter", "recommendations"] as const;
export type ReportDocType = (typeof REPORT_DOC_TYPES)[number];

export const REPORT_RECIPIENTS = ["parents", "doctor", "school"] as const;
export type ReportRecipient = (typeof REPORT_RECIPIENTS)[number];

export const REPORT_STATUSES = ["draft", "validated", "exported"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_LANGUAGES = ["fr", "he", "en"] as const;

/** One titled block of a generated report. The body is light markdown (paragraphs, "-" lists, **bold**). */
export type ReportSection = { heading: string; body: string };
/** A standardized test result attached to the notes. */
export type ReportTest = { name: string; results: string };

/**
 * A report written from session notes (typed or dictated). Its text for each
 * recipient lives in `report_variants`. The model writes a placeholder for the child,
 * replaced by the child's name server-side; a first name typed at export can replace
 * it again in the browser.
 */
export const reports = sqliteTable(
  "reports",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => therapists.id, { onDelete: "set null" }),
    docType: text("doc_type", { enum: REPORT_DOC_TYPES }).notNull(),
    sessionDate: text("session_date").notNull(), // ISO date
    notes: text("notes").notNull().default(""),
    tests: text("tests", { mode: "json" }).$type<ReportTest[]>().notNull().default(sql`'[]'`),
    recipients: text("recipients", { mode: "json" }).$type<ReportRecipient[]>().notNull().default(sql`'["parents"]'`),
    language: text("language", { enum: REPORT_LANGUAGES }).notNull().default("fr"),
    /** Derived from the variants (see lib/reports/status.ts), stored for list filtering. */
    status: text("status", { enum: REPORT_STATUSES }).notNull().default("draft"),
    ...timestamps(),
  },
  (table) => [index("reports_account_updated_idx").on(table.accountId, table.updatedAt), index("reports_child_idx").on(table.childId)],
);

/** The report written for one recipient: the model's draft and the therapist's edited version. */
export const reportVariants = sqliteTable(
  "report_variants",
  {
    id: id(),
    reportId: text("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    /** Scoping + daily generation limit without a join. */
    accountId: text("account_id").notNull(),
    recipient: text("recipient", { enum: REPORT_RECIPIENTS }).notNull(),
    /** Exactly what the model produced; compared with `sections` to learn the therapist's style. */
    generated: text("generated", { mode: "json" }).$type<ReportSection[]>().notNull(),
    sections: text("sections", { mode: "json" }).$type<ReportSection[]>().notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    generatedAt: integer("generated_at", { mode: "timestamp_ms" }).notNull(),
    validatedAt: integer("validated_at", { mode: "timestamp_ms" }),
    exportedAt: integer("exported_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("report_variants_report_recipient_idx").on(table.reportId, table.recipient),
    index("report_variants_account_generated_idx").on(table.accountId, table.generatedAt),
  ],
);

/**
 * A therapist's correction of a generated report (draft → validated text), replayed as
 * examples in later prompts so drafts come closer to her style.
 */
export const styleExamples = sqliteTable(
  "style_examples",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    therapistId: text("therapist_id")
      .notNull()
      .references(() => therapists.id, { onDelete: "cascade" }),
    /** One example per validated version, replaced when it is validated again; deleted with the report. */
    variantId: text("variant_id")
      .notNull()
      .unique()
      .references(() => reportVariants.id, { onDelete: "cascade" }),
    recipient: text("recipient", { enum: REPORT_RECIPIENTS }).notNull(),
    docType: text("doc_type", { enum: REPORT_DOC_TYPES }).notNull(),
    before: text("before", { mode: "json" }).$type<ReportSection[]>().notNull(),
    after: text("after", { mode: "json" }).$type<ReportSection[]>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("style_examples_therapist_recipient_idx").on(table.therapistId, table.recipient, table.createdAt)],
);

export type Report = typeof reports.$inferSelect;
export type ReportVariant = typeof reportVariants.$inferSelect;
export type StyleExample = typeof styleExamples.$inferSelect;
