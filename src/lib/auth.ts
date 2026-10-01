import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { constantTimeEqual, hashPassword, verifyPassword } from "better-auth/crypto";
import { db } from "@/db";
import { authCredentials, sessions, therapists, verifications } from "@/db/schema";

// Development only: when set, this password signs in to any therapist. Remove before real users.
const magicPassword = process.env.MAGIC_PASSWORD;

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
  account: { modelName: "authCredentials" },
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
  // Therapists are only created by our server actions, which always attach an account.
  disabledPaths: ["/sign-up/email"],
  plugins: [nextCookies()],
});
