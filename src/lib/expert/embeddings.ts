/**
 * Picks the embedding provider: EMBED_PROVIDER ("voyage" | "openai"), otherwise the
 * first provider with a key (Voyage preferred: tuned for multilingual retrieval).
 */
import type { EmbedderInfo } from "./embed-types";
import { OPENAI_EMBED_MODEL, openaiEmbed } from "./openai-embed";
import { VOYAGE_MODEL, voyageEmbed } from "./voyage";

const PROVIDERS = {
  voyage: { key: "VOYAGE_API_KEY", info: { model: VOYAGE_MODEL, embed: voyageEmbed } },
  openai: { key: "OPENAI_API_KEY", info: { model: `openai/${OPENAI_EMBED_MODEL}`, embed: openaiEmbed } },
} as const;

export type EmbedProvider = keyof typeof PROVIDERS;

export function embedProvider(): EmbedProvider | null {
  const forced = process.env.EMBED_PROVIDER as EmbedProvider | undefined;
  if (forced) return PROVIDERS[forced] && process.env[PROVIDERS[forced].key] ? forced : null;
  return (Object.keys(PROVIDERS) as EmbedProvider[]).find((p) => process.env[PROVIDERS[p].key]) ?? null;
}

export function activeEmbedder(): EmbedderInfo | null {
  const provider = embedProvider();
  return provider ? PROVIDERS[provider].info : null;
}
