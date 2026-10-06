import type { Locale } from "@/i18n";
import type { ChatEvent } from "../events";

export const CHAT_PROVIDERS = ["claude-code", "anthropic", "openai"] as const;
export type ChatProvider = (typeof CHAT_PROVIDERS)[number];

/** One stored turn, in the provider's own message format (see chat_messages.content). */
export type StoredMessage = { role: "user" | "assistant" | "tool"; content: unknown };

export type RunArgs = {
  history: StoredMessage[];
  /** The new user message (with the pseudonymized child context prefix, if any). */
  prompt: string;
  locale: Locale;
  accountId: string;
  send: (event: ChatEvent) => void;
};

export type RunResult = {
  /** New turns to persist, starting with the user prompt. */
  newMessages: StoredMessage[];
  usage: { input: number; output: number };
  refused: boolean;
};

/** Thrown for provider-side outages (auth, rate limit, 5xx): shown as "unavailable". */
export class ProviderUnavailableError extends Error {}
