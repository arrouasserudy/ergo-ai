/**
 * Builds the SQL that replaces cabinets ("accounts") in another database with a copy of
 * them (used by `pnpm demo:push`, see push.sh). Pure: the CLI (export-account.ts) reads
 * the rows and writes the files.
 */

/** Tables copied with the account, in insertion order (parents first), and how to select their rows. */
export const COPIED_TABLES: { table: string; where: string }[] = [
  { table: "accounts", where: "id = :account" },
  { table: "therapists", where: "account_id = :account" },
  { table: "auth_credentials", where: "user_id IN (SELECT id FROM therapists WHERE account_id = :account)" },
  { table: "form_templates", where: "account_id = :account" },
  { table: "children", where: "account_id = :account" },
  { table: "episodes", where: "account_id = :account" },
  { table: "reports", where: "account_id = :account" },
  { table: "report_variants", where: "report_id IN (SELECT id FROM reports WHERE account_id = :account)" },
  { table: "style_examples", where: "account_id = :account" },
  { table: "child_forms", where: "account_id = :account" },
  { table: "assessments", where: "account_id = :account" },
  { table: "child_events", where: "account_id = :account" },
];

/** Tables deliberately left out of the copy (the target's rows are still deleted by the cascade). */
export const EXCLUDED_TABLES: Record<string, string> = {
  sessions: "logins are per database",
  verifications: "not account data",
  conversations: "Amit chats are private and not copied",
  chat_messages: "Amit chats are private and not copied",
  documents: "uploads need sqlite-vec vectors (refused when present)",
  document_chunks: "uploads need sqlite-vec vectors (refused when present)",
  __drizzle_migrations: "compared, never copied",
};
/** Virtual tables of the uploads' search indexes and their shadow tables. */
const EXCLUDED_PREFIXES = ["document_chunks_fts", "document_chunks_vec", "sqlite_"];

/** Columns that tie a row to an account, a child or something below them. */
const SCOPE_COLUMNS = ["account_id", "child_id", "user_id", "therapist_id", "report_id", "variant_id", "conversation_id", "document_id", "template_id"];

export type TableInfo = { name: string; columns: string[]; references: string[] };

/** Tables of the database that belong to an account but that this exporter does not know: they would be silently skipped. */
export function unknownScopedTables(tables: TableInfo[]): string[] {
  const known = new Set([...COPIED_TABLES.map((t) => t.table), ...Object.keys(EXCLUDED_TABLES)]);
  return tables
    .filter((t) => !known.has(t.name) && !EXCLUDED_PREFIXES.some((p) => t.name.startsWith(p)))
    .filter((t) => t.columns.some((c) => SCOPE_COLUMNS.includes(c)) || t.references.some((r) => known.has(r) && r !== "__drizzle_migrations"))
    .map((t) => t.name);
}

/** Throws when the database has an account-scoped table this exporter does not handle. */
export function assertKnownTables(tables: TableInfo[]): void {
  const unknown = unknownScopedTables(tables);
  if (unknown.length) {
    throw new Error(
      `Unknown account-scoped table(s): ${unknown.join(", ")}. Add them to COPIED_TABLES (or EXCLUDED_TABLES, with a reason) in scripts/demo/account-sql.ts.`,
    );
  }
}

/** A value as an SQLite literal, exactly as stored: NULL, integers, reals, text, blobs. */
export function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Cannot write ${value} as SQL`);
    // A REAL stays a REAL (integers read with safeIntegers come as bigint).
    return Number.isInteger(value) ? value.toFixed(1) : String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") {
    if (value.includes("\0")) throw new Error("Cannot write a NUL character in an SQL text literal");
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString("hex").toUpperCase()}'`;
  throw new Error(`Cannot write a ${typeof value} as SQL`);
}

const ident = (name: string) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Unexpected identifier: ${name}`);
  return `"${name}"`;
};

export function insertStatement(table: string, row: Record<string, unknown>): string {
  const columns = Object.keys(row);
  return `INSERT INTO ${ident(table)} (${columns.map(ident).join(", ")}) VALUES (${columns.map((c) => sqlValue(row[c])).join(", ")});`;
}

/** The `where` of a copied table with the account id in place. */
export function whereFor(where: string, accountId: string): string {
  return where.split(":account").join(sqlValue(accountId));
}

/**
 * One transaction: delete each account in the target (cascades through every table that
 * references it; tables holding an account_id without a foreign key are cleared explicitly
 * first), then insert every copied row. sqlite3 CLI script: `.bail on` stops at the first
 * error, leaving the transaction uncommitted (rolled back): all the accounts or none.
 */
export function accountSql(accounts: { accountId: string; rows: { table: string; rows: Record<string, unknown>[] }[] }[], header: string): string {
  const lines = [`-- ${header.replace(/\n/g, " ")}`, ".bail on", ".timeout 5000", "PRAGMA foreign_keys = ON;", "BEGIN IMMEDIATE;"];
  for (const { accountId } of accounts) {
    const id = sqlValue(accountId);
    lines.push(
      `DELETE FROM chat_messages WHERE account_id = ${id};`,
      `DELETE FROM report_variants WHERE account_id = ${id};`,
      `DELETE FROM document_chunks WHERE account_id = ${id};`,
      `DELETE FROM accounts WHERE id = ${id};`,
    );
  }
  for (const { rows } of accounts) for (const { table, rows: tableRows } of rows) for (const row of tableRows) lines.push(insertStatement(table, row));
  lines.push("COMMIT;", "");
  return lines.join("\n");
}

/**
 * Checks run on the target before pushing, one "accountId|key|value" line each: whether the
 * account exists there with the same name and owner email, emails used by another account,
 * uploaded documents and Amit conversations that the push would delete.
 */
export function checkSql(accountId: string, name: string, ownerEmail: string, emails: string[]): string {
  const id = sqlValue(accountId);
  const key = (k: string) => `${id} || '|${k}|' ||`;
  return [
    ".timeout 5000",
    `SELECT ${key("account")} CASE WHEN NOT EXISTS (SELECT 1 FROM accounts WHERE id = ${id}) THEN 'new' WHEN EXISTS (SELECT 1 FROM accounts a JOIN therapists t ON t.account_id = a.id AND t.role = 'owner' WHERE a.id = ${id} AND a.name = ${sqlValue(name)} AND t.email = ${sqlValue(ownerEmail)}) THEN 'same' ELSE 'different' END;`,
    `SELECT ${key("target")} coalesce((SELECT a.name || ' / ' || coalesce(group_concat(t.email), '') FROM accounts a LEFT JOIN therapists t ON t.account_id = a.id AND t.role = 'owner' WHERE a.id = ${id} GROUP BY a.id), '');`,
    `SELECT ${key("emails_elsewhere")} coalesce(group_concat(email), '') FROM therapists WHERE email IN (${emails.map(sqlValue).join(", ") || "NULL"}) AND account_id <> ${id};`,
    `SELECT ${key("documents")} count(*) FROM documents WHERE account_id = ${id};`,
    `SELECT ${key("conversations")} count(*) FROM conversations WHERE account_id = ${id};`,
    "",
  ].join("\n");
}

/** Row counts per table for the account ("accountId|table|count"), compared with the local counts after the push. */
export function countsSql(accountId: string): string {
  const id = sqlValue(accountId);
  return [".timeout 5000", ...COPIED_TABLES.map(({ table, where }) => `SELECT ${id} || '|${table}|' || count(*) FROM ${ident(table)} WHERE ${whereFor(where, accountId)};`), ""].join("\n");
}

/** Row counts of every other account ("table|count"), recorded before and after to prove they are untouched. */
export function otherAccountsSql(accountIds: string[]): string {
  if (accountIds.length === 0) throw new Error("No account to exclude");
  const others = `(SELECT id FROM accounts WHERE id NOT IN (${accountIds.map(sqlValue).join(", ")}))`;
  const tables: [string, string][] = [
    ["accounts", `id IN ${others}`],
    ["therapists", `account_id IN ${others}`],
    ["auth_credentials", `user_id IN (SELECT id FROM therapists WHERE account_id IN ${others})`],
    ["form_templates", `account_id IN ${others}`],
    ["children", `account_id IN ${others}`],
    ["episodes", `account_id IN ${others}`],
    ["reports", `account_id IN ${others}`],
    ["report_variants", `account_id IN ${others}`],
    ["style_examples", `account_id IN ${others}`],
    ["child_forms", `account_id IN ${others}`],
    ["assessments", `account_id IN ${others}`],
    ["child_events", `account_id IN ${others}`],
    ["conversations", `account_id IN ${others}`],
    ["chat_messages", `account_id IN ${others}`],
    ["documents", `account_id IN ${others}`],
  ];
  return [".timeout 5000", ...tables.map(([table, where]) => `SELECT '${table}|' || count(*) FROM ${ident(table)} WHERE ${where};`), ""].join("\n");
}
