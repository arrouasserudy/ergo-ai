import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

const LIBRARY_PATH = process.env.LIBRARY_PATH ?? path.join(path.dirname(process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "ergoai.db")), "library.db");

let cached: { db: Database.Database; mtimeMs: number } | null = null;

/**
 * The shared literature library, opened read-only. Reopened when the file changes
 * (a new corpus pushed with `pnpm corpus:push`). Returns null when no library exists yet.
 */
export function openLibrary(): Database.Database | null {
  let stat: fs.Stats;
  try {
    // The path is runtime configuration (the Fly volume), not a build input.
    stat = fs.statSync(/*turbopackIgnore: true*/ LIBRARY_PATH);
  } catch {
    return null;
  }
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.db;

  cached?.db.close();
  const db = new Database(/*turbopackIgnore: true*/ LIBRARY_PATH, { readonly: true, fileMustExist: true });
  sqliteVec.load(db);
  cached = { db, mtimeMs: stat.mtimeMs };
  return db;
}
