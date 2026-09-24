import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { authCredentials, sessions, therapists, verifications } from "@/db/schema";

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
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  // Therapists are only created by our server actions, which always attach an account.
  disabledPaths: ["/sign-up/email"],
  plugins: [nextCookies()],
});
