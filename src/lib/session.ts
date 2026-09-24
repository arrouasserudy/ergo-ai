import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { accounts, type TherapistRole } from "@/db/schema";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/**
 * The single access check for pages and server actions: returns the signed-in
 * therapist and their account, or redirects to the login page.
 */
export const requireTherapist = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");

  const { user } = session;
  const account = db.select().from(accounts).where(eq(accounts.id, user.accountId)).get();
  if (!account) redirect("/login");

  return {
    therapist: { id: user.id, name: user.name, email: user.email },
    role: user.role as TherapistRole,
    accountId: account.id,
    account,
  };
});

/** For owner-only server actions; members never see the UI that calls them. */
export async function requireOwner() {
  const ctx = await requireTherapist();
  if (ctx.role !== "owner") throw new Error("Forbidden: owner role required");
  return ctx;
}
