import "server-only";
import { runAnthropic } from "./anthropic";
import { runClaudeCode } from "./claude-code";
import { runOpenAI } from "./openai";
import { CHAT_PROVIDERS, type ChatProvider, type RunArgs, type RunResult } from "./types";

/** Credential each provider needs; "claude-code" is a Claude.ai subscription token. */
const KEYS: Record<ChatProvider, string> = {
  "claude-code": "CLAUDE_CODE_OAUTH_TOKEN",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

export function providerAvailable(provider: ChatProvider): boolean {
  return Boolean(process.env[KEYS[provider]]?.trim());
}

/**
 * Provider for every AI feature (Amit's new conversations, reports, forms): AI_PROVIDER
 * (or the older EXPERT_PROVIDER), else the first one with a credential, in CHAT_PROVIDERS order.
 */
export function defaultProvider(): ChatProvider | null {
  const forced = (process.env.AI_PROVIDER || process.env.EXPERT_PROVIDER) as ChatProvider | undefined;
  if (forced) return CHAT_PROVIDERS.includes(forced) && providerAvailable(forced) ? forced : null;
  return CHAT_PROVIDERS.find(providerAvailable) ?? null;
}

export function runProvider(provider: ChatProvider, args: RunArgs): Promise<RunResult> {
  if (provider === "openai") return runOpenAI(args);
  if (provider === "claude-code") return runClaudeCode(args);
  return runAnthropic(args);
}
