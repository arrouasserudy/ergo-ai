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

export function activeEmbedder(): EmbedderInfo | null {
  const forced = process.env.EMBED_PROVIDER as keyof typeof PROVIDERS | undefined;
  if (forced) {
    const p = PROVIDERS[forced];
    return p && process.env[p.key] ? p.info : null;
  }
  for (const p of Object.values(PROVIDERS)) if (process.env[p.key]) return p.info;
  return null;
}
