/**
 * Voyage AI embeddings over REST (https://docs.voyageai.com/docs/embeddings).
 * Only literature text and search queries are sent here, never child data.
 */
import { EMBED_DIMS, type Embedder } from "./embed-types";

export const VOYAGE_MODEL = "voyage-4";

type VoyageResponse = { data: { embedding: number[]; index: number }[]; usage: { total_tokens: number } };

/** Voyage returns int8 vectors (normalized before quantization), stored as-is in sqlite-vec. */
export const voyageEmbed: Embedder = async (texts, inputType) => {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const out: Int8Array[] = [];
  const BATCH = 64;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    let attempt = 0;
    while (true) {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ input: batch, model: VOYAGE_MODEL, input_type: inputType, output_dimension: EMBED_DIMS, output_dtype: "int8" }),
      });
      if (res.ok) {
        const json = (await res.json()) as VoyageResponse;
        for (const d of json.data.sort((a, b) => a.index - b.index)) out.push(Int8Array.from(d.embedding));
        break;
      }
      // Retry rate limits and server errors with backoff.
      if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt++));
        continue;
      }
      throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
    }
  }
  return out;
};
