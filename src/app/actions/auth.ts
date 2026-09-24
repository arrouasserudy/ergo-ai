"use server";

import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { t } from "@/i18n/fr";
import { auth } from "@/lib/auth";
import { createTherapist, EmailTakenError } from "@/lib/therapists";
import { formDataToStrings, loginSchema, signupSchema, toFieldErrors } from "@/lib/validation";
import type { FormState } from "./children";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const input = formDataToStrings(formData, ["email", "password"]);
  const values = { email: input.email }; // never echo the password back
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values };

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError) return { ok: false, errors: { form: t.auth.invalidCredentials }, values };
    throw error;
  }
  redirect("/children");
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const input = formDataToStrings(formData, ["accountName", "name", "email", "password"]);
  const values = { accountName: input.accountName, name: input.name, email: input.email }; // never echo the password back
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values };

  const { accountName, name, email, password } = parsed.data;
  const account = db.insert(accounts).values({ name: accountName }).returning().get();
  try {
    await createTherapist({ accountId: account.id, role: "owner", name, email, password });
  } catch (error) {
    db.delete(accounts).where(eq(accounts.id, account.id)).run();
    if (error instanceof EmailTakenError) return { ok: false, errors: { email: t.errors.emailTaken }, values };
    throw error;
  }

  await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
  redirect("/children");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
