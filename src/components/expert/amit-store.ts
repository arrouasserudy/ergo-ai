"use client";

/**
 * Lets any page open the Amit bubble (mounted once in the app layout) without a navigation:
 * a request is queued here and picked up by the bubble.
 */
export type AmitRequest =
  /** A new conversation, optionally about a child; with an episode in progress, help is asked right away. */
  | { kind: "new"; childId?: string | null; episodeId?: string | null }
  /** A stored conversation. */
  | { kind: "conversation"; id: string };

type Listener = (request: AmitRequest) => void;

let listener: Listener | null = null;
let queued: AmitRequest | null = null;

export function openAmit(request: AmitRequest = { kind: "new" }) {
  if (listener) listener(request);
  else queued = request;
}

/** Registered by the bubble; a request made before it mounted is delivered right away. */
export function onAmitRequest(fn: Listener): () => void {
  listener = fn;
  if (queued) {
    const request = queued;
    queued = null;
    fn(request);
  }
  return () => {
    if (listener === fn) listener = null;
  };
}
