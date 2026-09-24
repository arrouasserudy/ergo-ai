import "server-only";
import { runAnthropic } from "./anthropic";
import { runOpenAI } from "./openai";
import type { ChatProvider, RunArgs, RunResult } from "./types";

const KEYS: Record<ChatProvider, string> = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY" };

export function providerAvailable(provider: ChatProvider): boolean {
  return Boolean(process.env[KEYS[provider]]);
}

/** Provider for new conversations: EXPERT_PROVIDER, else the first one with a key (Claude preferred). */
export function defaultProvider(): ChatProvider | null {
  const forced = process.env.EXPERT_PROVIDER as ChatProvider | undefined;
  if (forced) return forced in KEYS && providerAvailable(forced) ? forced : null;
  if (providerAvailable("anthropic")) return "anthropic";
  if (providerAvailable("openai")) return "openai";
  return null;
}

export function runProvider(provider: ChatProvider, args: RunArgs): Promise<RunResult> {
  return provider === "openai" ? runOpenAI(args) : runAnthropic(args);
}
