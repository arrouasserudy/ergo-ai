/**
 * OpenAI embeddings (text-embedding-3-large, shortened to 1024 dimensions and
 * quantized to int8 so they fit the same sqlite-vec tables as Voyage vectors).
 * Only literature text and search queries are sent here, never child data.
 */
import OpenAI from "openai";
import { EMBED_DIMS, quantizeToInt8, type Embedder } from "./embed-types";

export const OPENAI_EMBED_MODEL = "text-embedding-3-large";

let client: OpenAI | null = null;

export const openaiEmbed: Embedder = async (texts) => {
  client ??= new OpenAI(); // reads OPENAI_API_KEY; retries 429/5xx itself
  const out: Int8Array[] = [];
  const BATCH = 128;
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await client.embeddings.create({
      model: OPENAI_EMBED_MODEL,
      input: texts.slice(i, i + BATCH),
      dimensions: EMBED_DIMS,
      encoding_format: "float",
    });
    for (const d of [...res.data].sort((a, b) => a.index - b.index)) out.push(quantizeToInt8(d.embedding));
  }
  return out;
};
