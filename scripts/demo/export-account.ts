/**
 * Exports accounts of the local database (default: every demo cabinet) as the SQL files
 * that push.sh applies to production:
 *   accounts.txt  one "accountId|name|ownerEmail" line per account
 *   push.sql      delete the accounts in the target, then insert every row (one transaction)
 *   check.sql     pre-flight checks on the target (same account? emails taken? uploads?)
 *   counts.sql    the accounts' row counts, compared with expected.txt after the push
 *   others.sql    every other account's row counts, recorded before and after
 *
 *   tsx scripts/demo/export-account.ts <outDir> [fr|he|en|accountId …]
 *
 * Reads $DATABASE_PATH (default data/ergoai.db), read-only. Refuses an account with
 * uploaded documents (their vectors need sqlite-vec, which the production CLI lacks) and
 * a database with an account-scoped table it does not know.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { resolveDemoTargets } from "../../src/db/demo-ids";
import { accountSql, assertKnownTables, checkSql, COPIED_TABLES, countsSql, otherAccountsSql, whereFor, type TableInfo } from "./account-sql";

const [outDir, ...args] = process.argv.slice(2);
if (!outDir) {
  console.error("Usage: tsx scripts/demo/export-account.ts <outDir> [fr|he|en|accountId …]");
  process.exit(2);
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

let accountIds: string[];
try {
  accountIds = [...new Set(resolveDemoTargets(args).map((t) => t.accountId))];
} catch (error) {
  fail((error as Error).message);
}

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "ergoai.db");
const sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });
sqlite.defaultSafeIntegers(true); // integers as bigint, so they are written back exactly

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

const exported = accountIds.map((accountId) => {
  const account = sqlite.prepare("SELECT id, name FROM accounts WHERE id = ?").get(accountId) as { id: string; name: string } | undefined;
  if (!account) fail(`No account ${accountId} in ${dbPath}.`);
  const owner = sqlite.prepare("SELECT email FROM therapists WHERE account_id = ? AND role = 'owner' ORDER BY created_at LIMIT 1").get(accountId) as { email: string } | undefined;
  if (!owner) fail(`Account ${accountId} has no owner therapist.`);
  const emails = (sqlite.prepare("SELECT email FROM therapists WHERE account_id = ?").all(accountId) as { email: string }[]).map((r) => r.email);

  const documents = Number((sqlite.prepare("SELECT count(*) AS n FROM documents WHERE account_id = ?").get(accountId) as { n: bigint }).n);
  if (documents > 0) {
    fail(`"${account.name}" has ${documents} uploaded document(s): their vectors need sqlite-vec, which the production sqlite3 CLI lacks. Remove them first (upload them again in production).`);
  }
  const conversations = Number((sqlite.prepare("SELECT count(*) AS n FROM conversations WHERE account_id = ?").get(accountId) as { n: bigint }).n);
  if (conversations > 0) console.warn(`! "${account.name}": ${conversations} Amit conversation(s) are not copied.`);

  const rows = COPIED_TABLES.map(({ table, where }) => ({
    table,
    rows: sqlite.prepare(`SELECT * FROM "${table}" WHERE ${whereFor(where, accountId)} ORDER BY rowid`).all() as Record<string, unknown>[],
  }));
  return { accountId, name: account.name, owner: owner.email, emails, rows };
});

fs.mkdirSync(outDir, { recursive: true });
const write = (file: string, content: string) => fs.writeFileSync(path.join(outDir, file), content);
const header = `Accounts ${exported.map((a) => `${a.accountId} (${a.name})`).join(", ")} exported from ${path.basename(dbPath)} on ${new Date().toISOString()}`;
write("accounts.txt", exported.map((a) => `${a.accountId}|${a.name}|${a.owner}`).join("\n") + "\n");
write("push.sql", accountSql(exported, header));
write("check.sql", exported.map((a) => checkSql(a.accountId, a.name, a.owner, a.emails)).join(""));
write("counts.sql", exported.map((a) => countsSql(a.accountId)).join(""));
write("others.sql", otherAccountsSql(accountIds));
write("expected.txt", exported.flatMap((a) => a.rows.map((r) => `${a.accountId}|${r.table}|${r.rows.length}`)).join("\n") + "\n");

for (const a of exported) {
  console.log(`Exported "${a.name}" (owner ${a.owner}) from ${dbPath}:`);
  console.log(`  ${a.rows.map((r) => `${r.table} ${r.rows.length}`).join(", ")}`);
}
