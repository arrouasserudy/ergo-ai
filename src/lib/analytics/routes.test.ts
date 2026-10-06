import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES, routeOf } from "./routes";

const APP_DIR = path.resolve(__dirname, "../../app/(app)");
/** Pages that only redirect, and the admin pages (admins are not counted). */
const NOT_TRACKED = ["/expert", "/expert/[id]", "/resources", "/admin/usage", "/admin/usage/[therapistId]"];

function pageRoutes(dir: string, prefix = ""): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isFile()) return entry.name === "page.tsx" ? [prefix || "/"] : [];
    if (!entry.isDirectory()) return [];
    const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
    return pageRoutes(path.join(dir, entry.name), prefix + segment);
  });
}

describe("APP_ROUTES", () => {
  it("lists every page of the app", () => {
    const pages = pageRoutes(APP_DIR).filter((route) => !NOT_TRACKED.includes(route));
    expect([...APP_ROUTES].sort()).toEqual(pages.sort());
  });
});

describe("routeOf", () => {
  it("replaces ids by the route's parameters", () => {
    expect(routeOf("/children/0b1c2d3e-aaaa-4bbb-8ccc-123456789abc/progress")).toBe("/children/[id]/progress");
    expect(routeOf("/assessments/sensory-profile-2")).toBe("/assessments/[testId]");
    expect(routeOf("/")).toBe("/");
  });

  it("prefers static segments", () => {
    expect(routeOf("/children/new")).toBe("/children/new");
    expect(routeOf("/reports/new")).toBe("/reports/new");
    expect(routeOf("/reports/abc")).toBe("/reports/[id]");
  });

  it("ignores a trailing slash and returns null for unknown paths", () => {
    expect(routeOf("/children/")).toBe("/children");
    expect(routeOf("/nope")).toBeNull();
    expect(routeOf("/children/a/b/c/d")).toBeNull();
  });
});
