import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { therapists, type TherapistRole } from "@/db/schema";
import { auth } from "@/lib/auth";

export class EmailTakenError extends Error {}

/**
 * Creates a therapist with an email/password login inside an account,
 * without touching the current session (unlike the sign-up endpoint).
 */
export async function createTherapist(input: {
  accountId: string;
  role: TherapistRole;
  name: string;
  email: string;
  password: string;
}) {
  const ctx = await auth.$context;
  const email = input.email.toLowerCase();
  if (await ctx.internalAdapter.findUserByEmail(email)) throw new EmailTakenError(email);

  const user = await ctx.internalAdapter.createUser(
    { name: input.name, email, emailVerified: false, accountId: input.accountId, role: input.role },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    providerId: "credential",
    accountId: user.id,
    userId: user.id,
    password: await ctx.password.hash(input.password),
  });
  return user;
}

export function listTherapists(accountId: string) {
  return db
    .select({ id: therapists.id, name: therapists.name, email: therapists.email, role: therapists.role, createdAt: therapists.createdAt })
    .from(therapists)
    .where(eq(therapists.accountId, accountId))
    .orderBy(asc(therapists.createdAt))
    .all();
}
