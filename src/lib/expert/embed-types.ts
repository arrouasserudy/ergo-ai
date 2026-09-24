/** All embedders produce int8 vectors of this size, so the sqlite-vec tables are shared. */
export const EMBED_DIMS = 1024;

export type Embedder = (texts: string[], inputType: "query" | "document") => Promise<Int8Array[]>;

/**
 * An embedder plus the model id recorded next to the vectors it produced.
 * Vectors from different models are not comparable: search only uses matching ones.
 */
export type EmbedderInfo = { model: string; embed: Embedder };

/** Unit-normalizes a float vector and quantizes it to int8 (cosine ranking is preserved). */
export function quantizeToInt8(vector: number[]): Int8Array {
  const norm = Math.hypot(...vector) || 1;
  return Int8Array.from(vector, (x) => Math.max(-127, Math.min(127, Math.round((x / norm) * 127))));
}
