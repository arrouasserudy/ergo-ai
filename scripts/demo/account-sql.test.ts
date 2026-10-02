import { describe, expect, it } from "vitest";
import { accountSql, checkSql, COPIED_TABLES, countsSql, insertStatement, otherAccountsSql, sqlValue, unknownScopedTables, whereFor, type TableInfo } from "./account-sql";

describe("sqlValue", () => {
  it("writes each SQLite storage class exactly", () => {
    expect(sqlValue(null)).toBe("NULL");
    expect(sqlValue(undefined)).toBe("NULL");
    expect(sqlValue(BigInt("1790279184629"))).toBe("1790279184629");
    expect(sqlValue(BigInt("-3"))).toBe("-3");
    expect(sqlValue(2.5)).toBe("2.5");
    expect(sqlValue(3)).toBe("3.0"); // a REAL stays a REAL
    expect(sqlValue(true)).toBe("1");
    expect(sqlValue(new Uint8Array([0, 171, 255]))).toBe("X'00ABFF'");
  });

  it("quotes text, doubling single quotes, keeping newlines, JSON and Unicode as is", () => {
    expect(sqlValue("Cabinet d'ergothérapie")).toBe("'Cabinet d''ergothérapie'");
    expect(sqlValue("a\nb")).toBe("'a\nb'");
    expect(sqlValue('[{"heading":"L\'été","body":"«{{child}}»"}]')).toBe("'[{\"heading\":\"L''été\",\"body\":\"«{{child}}»\"}]'");
    expect(sqlValue("תצפית אכילה")).toBe("'תצפית אכילה'");
    expect(sqlValue("'; DROP TABLE accounts; --")).toBe("'''; DROP TABLE accounts; --'");
  });

  it("refuses what it cannot write faithfully", () => {
    expect(() => sqlValue("a\0b")).toThrow();
    expect(() => sqlValue(Number.NaN)).toThrow();
    expect(() => sqlValue({})).toThrow();
  });
});

describe("insertStatement", () => {
  it("names every column", () => {
    expect(insertStatement("children", { id: "c1", name: "Léa", siblings_count: null })).toBe(
      `INSERT INTO "children" ("id", "name", "siblings_count") VALUES ('c1', 'Léa', NULL);`,
    );
  });

  it("refuses unexpected identifiers", () => {
    expect(() => insertStatement("children; --", { id: "x" })).toThrow();
    expect(() => insertStatement("children", { 'id"': "x" })).toThrow();
  });
});

describe("whereFor / accountSql", () => {
  it("puts the quoted account id in place", () => {
    expect(whereFor("account_id = :account", "a'b")).toBe("account_id = 'a''b'");
  });

  it("deletes the account then inserts parents before children, in one transaction", () => {
    const sql = accountSql(
      [
        {
          accountId: "acc",
          rows: [
            { table: "accounts", rows: [{ id: "acc", name: "A" }] },
            { table: "children", rows: [{ id: "c", account_id: "acc" }] },
          ],
        },
      ],
      "header",
    );
    const lines = sql.trim().split("\n");
    expect(lines.slice(1, 5)).toEqual([".bail on", ".timeout 5000", "PRAGMA foreign_keys = ON;", "BEGIN IMMEDIATE;"]);
    expect(sql.indexOf("DELETE FROM accounts WHERE id = 'acc';")).toBeLessThan(sql.indexOf('INSERT INTO "accounts"'));
    expect(sql.indexOf('INSERT INTO "accounts"')).toBeLessThan(sql.indexOf('INSERT INTO "children"'));
    expect(lines.at(-1)).toBe("COMMIT;");
  });

  it("replaces several accounts in a single transaction, deleting them all first", () => {
    const account = (id: string) => ({ accountId: id, rows: [{ table: "accounts", rows: [{ id, name: id }] }] });
    const sql = accountSql([account("a1"), account("a2")], "header");
    expect(sql.match(/BEGIN IMMEDIATE;/g)).toHaveLength(1);
    expect(sql.match(/COMMIT;/g)).toHaveLength(1);
    expect(sql.indexOf("DELETE FROM accounts WHERE id = 'a2';")).toBeLessThan(sql.indexOf("INSERT INTO \"accounts\""));
    expect(sql.indexOf("VALUES ('a1'")).toBeLessThan(sql.indexOf("VALUES ('a2'"));
  });
});

describe("checkSql / countsSql / otherAccountsSql", () => {
  it("prefixes every check and count with the account id", () => {
    const checks = checkSql("a1", "Cabinet d'A", "x@y.z", ["x@y.z"]).split("\n").filter((l) => l.startsWith("SELECT"));
    expect(checks).toHaveLength(5);
    for (const line of checks) expect(line).toMatch(/^SELECT 'a1' \|\| '\|[a-z_]+\|' \|\|/);
    expect(checks[0]).toContain("'Cabinet d''A'");
    const counts = countsSql("a1").split("\n").filter((l) => l.startsWith("SELECT"));
    expect(counts).toHaveLength(COPIED_TABLES.length);
    expect(counts[0]).toBe(`SELECT 'a1' || '|accounts|' || count(*) FROM "accounts" WHERE id = 'a1';`);
  });

  it("counts the accounts that are not pushed", () => {
    const sql = otherAccountsSql(["a1", "a'2"]);
    expect(sql).toContain("WHERE id NOT IN ('a1', 'a''2')");
    expect(() => otherAccountsSql([])).toThrow();
  });

  it("copies parents before the tables that reference them", () => {
    const order = COPIED_TABLES.map((t) => t.table);
    expect(order.indexOf("therapists")).toBeLessThan(order.indexOf("children"));
    expect(order.indexOf("reports")).toBeLessThan(order.indexOf("report_variants"));
    expect(order.indexOf("report_variants")).toBeLessThan(order.indexOf("style_examples"));
    expect(order.indexOf("form_templates")).toBeLessThan(order.indexOf("child_forms"));
    expect(order.indexOf("reports")).toBeLessThan(order.indexOf("child_events"));
  });
});

describe("unknownScopedTables", () => {
  const table = (name: string, columns: string[], references: string[] = []): TableInfo => ({ name, columns, references });

  it("accepts the tables it copies or excludes on purpose, and unscoped ones", () => {
    expect(
      unknownScopedTables([
        table("children", ["id", "account_id"], ["accounts"]),
        table("sessions", ["id", "user_id"], ["therapists"]),
        table("document_chunks_fts_data", ["id", "block"]),
        table("sqlite_sequence", ["name", "seq"]),
        table("settings", ["key", "value"]),
      ]),
    ).toEqual([]);
  });

  it("flags a new table holding an account, child or user id, or referencing a known table", () => {
    expect(
      unknownScopedTables([
        table("meetings", ["id", "account_id", "child_id"], ["accounts", "children"]),
        table("child_files", ["id", "child_id"]),
        table("report_comments", ["id", "body", "parent"], ["reports"]),
      ]),
    ).toEqual(["meetings", "child_files", "report_comments"]);
  });
});
