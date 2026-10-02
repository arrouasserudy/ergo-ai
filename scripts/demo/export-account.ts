/**
 * Exports one account of the local database (default: the demo cabinet) as the SQL files
 * that push.sh applies to production:
 *   push.sql      delete the account in the target, then insert every row (one transaction)
 *   check.sql     pre-flight checks on the target (same account? emails taken? uploads?)
 *   counts.sql    the account's row counts, compared with expected.txt after the push
 *   others.sql    every other account's row counts, recorded before and after
 *
 *   tsx scripts/demo/export-account.ts <outDir> [accountId]
 *
 * Reads $DATABASE_PATH (default data/ergoai.db), read-only. Refuses an account with
 * uploaded documents (their vectors need sqlite-vec, which the production CLI lacks) and
 * a database with an account-scoped table it does not know.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DEMO_ACCOUNT_ID } from "../../src/db/demo-ids";
import { accountSql, assertKnownTables, checkSql, COPIED_TABLES, countsSql, otherAccountsSql, whereFor, type TableInfo } from "./account-sql";

const [outDir, accountId = DEMO_ACCOUNT_ID] = process.argv.slice(2);
if (!outDir) {
  console.error("Usage: tsx scripts/demo/export-account.ts <outDir> [accountId]");
  process.exit(2);
}
if (!/^[0-9a-f-]{36}$/.test(accountId)) {
  console.error(`Not an account id: ${accountId}`);
  process.exit(2);
}

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "ergoai.db");
const sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });
sqlite.defaultSafeIntegers(true); // integers as bigint, so they are written back exactly

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

// Every table of the database must be known: copied, or excluded on purpose.
const tableRows = sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table'").all() as { name: string; sql: string | null }[];
const tables: TableInfo[] = tableRows
  .filter((t) => !/^CREATE VIRTUAL/i.test(t.sql ?? "")) // vec0 tables can't be inspected without the extension
  .map((t) => ({
    name: t.name,
    columns: (sqlite.prepare(`PRAGMA table_info("${t.name}")`).all() as { name: string }[]).map((c) => c.name),
    references: (sqlite.prepare(`PRAGMA foreign_key_list("${t.name}")`).all() as { table: string }[]).map((f) => f.table),
  }));
try {
  assertKnownTables(tables);
} catch (error) {
  fail((error as Error).message);
}

const account = sqlite.prepare("SELECT id, name FROM accounts WHERE id = ?").get(accountId) as { id: string; name: string } | undefined;
if (!account) fail(`No account ${accountId} in ${dbPath}.`);
const owner = sqlite.prepare("SELECT email FROM therapists WHERE account_id = ? AND role = 'owner' ORDER BY created_at LIMIT 1").get(accountId) as { email: string } | undefined;
if (!owner) fail(`Account ${accountId} has no owner therapist.`);
const emails = (sqlite.prepare("SELECT email FROM therapists WHERE account_id = ?").all(accountId) as { email: string }[]).map((r) => r.email);

const documents = Number((sqlite.prepare("SELECT count(*) AS n FROM documents WHERE account_id = ?").get(accountId) as { n: bigint }).n);
if (documents > 0) {
  fail(`The account has ${documents} uploaded document(s): their vectors need sqlite-vec, which the production sqlite3 CLI lacks. Remove them first (upload them again in production).`);
}
const conversations = Number((sqlite.prepare("SELECT count(*) AS n FROM conversations WHERE account_id = ?").get(accountId) as { n: bigint }).n);
if (conversations > 0) console.warn(`! ${conversations} Amit conversation(s) are not copied.`);

const rows = COPIED_TABLES.map(({ table, where }) => ({
  table,
  rows: sqlite.prepare(`SELECT * FROM "${table}" WHERE ${whereFor(where, accountId)} ORDER BY rowid`).all() as Record<string, unknown>[],
}));

fs.mkdirSync(outDir, { recursive: true });
const header = `Account ${accountId} (${account.name}) exported from ${path.basename(dbPath)} on ${new Date().toISOString()}`;
fs.writeFileSync(path.join(outDir, "push.sql"), accountSql(accountId, rows, header));
fs.writeFileSync(path.join(outDir, "check.sql"), checkSql(accountId, account.name, owner.email, emails));
fs.writeFileSync(path.join(outDir, "counts.sql"), countsSql(accountId));
fs.writeFileSync(path.join(outDir, "others.sql"), otherAccountsSql(accountId));
fs.writeFileSync(path.join(outDir, "expected.txt"), rows.map((r) => `${r.table}|${r.rows.length}`).join("\n") + "\n");

console.log(`Exported "${account.name}" (owner ${owner.email}) from ${dbPath}:`);
for (const r of rows) console.log(`  ${r.table.padEnd(18)} ${r.rows.length}`);
