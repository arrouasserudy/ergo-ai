import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Same default as src/db/index.ts; set DATABASE_PATH to open another file (e.g. a prod snapshot).
  dbCredentials: { url: process.env.DATABASE_PATH ?? "./data/ergoai.db" },
});
