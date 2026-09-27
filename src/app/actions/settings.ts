"use server";

import { and, eq, ne } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { HIDE_NAMES_COOKIE } from "@/i18n";
import { auth } from "@/lib/auth";
import { getSession, requireTherapist } from "@/lib/session";
import { formDataToStrings, passwordChangeSchema, profileSchema, toFieldErrors } from "@/lib/validation";
import type { FormState } from "./children";

// Personal settings of the signed-in therapist: Better Auth acts on the session's own user.

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireTherapist();
  const input = formDataToStrings(formData, ["name"]);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };

  await auth.api.updateUser({ body: { name: parsed.data.name }, headers: await headers() });
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { therapist } = await requireTherapist();
  const input = formDataToStrings(formData, ["currentPassword", "newPassword", "confirmPassword"]);
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) }; // never echo passwords back

  const { currentPassword, newPassword } = parsed.data;
  try {
    await auth.api.changePassword({ body: { currentPassword, newPassword }, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError) return { ok: false, errors: { currentPassword: "wrongPassword" } };
    throw error;
  }
  // Sign out every other device. Better Auth's `revokeOtherSessions` also replaces the
  // current session, which the re-render (still holding the old cookie) would treat as signed out.
  const current = (await getSession())!.session;
  db.delete(sessions).where(and(eq(sessions.userId, therapist.id), ne(sessions.id, current.id))).run();
  return { ok: true, savedAt: Date.now() };
}

/** Hidden mode: per device, like the locale, so it can be turned on before sharing a screen. */
export async function setHideNames(hide: boolean) {
  await requireTherapist();
  const jar = await cookies();
  if (hide) jar.set(HIDE_NAMES_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  else jar.delete(HIDE_NAMES_COOKIE);
  revalidatePath("/", "layout");
}
