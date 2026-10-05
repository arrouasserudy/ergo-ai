import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { constantTimeEqual, hashPassword, verifyPassword } from "better-auth/crypto";
import { db } from "@/db";
import { accounts, authCredentials, sessions, therapists, verifications } from "@/db/schema";
import { ensureBuiltinForms } from "@/lib/forms/builtin";

// Development only: when set, this password signs in to any therapist. Remove before real users.
const magicPassword = process.env.MAGIC_PASSWORD;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
/** "Sign in with Google" is offered only when both credentials are configured. */
export const googleEnabled = !!googleClientId && !!googleClientSecret;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: { therapists, sessions, authCredentials, verifications },
  }),
  user: {
    modelName: "therapists",
    additionalFields: {
      // Set only by our server code (see lib/therapists.ts), never from client input.
      accountId: { type: "string", required: true, input: false },
      role: { type: "string", required: true, defaultValue: "member", input: false },
    },
  },
  session: { modelName: "sessions" },
  verification: { modelName: "verifications" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    password: {
      hash: hashPassword,
      verify: async (data) =>
        (!!magicPassword && constantTimeEqual(data.password, magicPassword)) || verifyPassword(data),
    },
  },
  socialProviders: googleEnabled ? { google: { clientId: googleClientId!, clientSecret: googleClientSecret!, prompt: "select_account" } } : {},
  // Google signs in to an existing therapist only once linked, or when their email is verified
  // (Better Auth's default): a password account, whose email is never verified, links Google from
  // Settings while signed in (same email required), so a look-alike sign-up can't capture it.
  account: { modelName: "authCredentials" },
  databaseHooks: {
    user: {
      create: {
        // Our server code always attaches an account; a first Google sign-in has none, so it
        // creates its own cabinet (named after the therapist, renamable in Settings) as owner.
        before: async (user) => {
          if ((user as { accountId?: string }).accountId) return;
          const account = db.insert(accounts).values({ name: user.name || user.email }).returning().get();
          return { data: { ...user, accountId: account.id, role: "owner" } };
        },
        after: async (user) => {
          ensureBuiltinForms(db, [(user as unknown as { accountId: string }).accountId]);
        },
      },
    },
  },
  // Email/password therapists are only created by our server actions, which always attach an account.
  disabledPaths: ["/sign-up/email"],
  plugins: [nextCookies()],
});
