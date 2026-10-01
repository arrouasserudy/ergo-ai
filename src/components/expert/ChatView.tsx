"use client";

import clsx from "clsx";
import { ArrowUp, ChevronDown, Info, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { previewChildContext } from "@/app/actions/expert";
import { NameWarning } from "@/components/ui/NameWarning";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";
import { useI18n } from "@/i18n/client";
import { stripMarkers, type AnswerPart } from "@/lib/expert/answer";
import { buildAnswer, type DisplayTurn } from "@/lib/expert/display";
import { parseEvents } from "@/lib/expert/events";
import { AnswerView } from "./AnswerView";

type ChildOption = { id: string; name: string };

type ChatViewProps = {
  conversationId: string | null;
  initialTurns: DisplayTurn[];
  /** Children to pick from when starting a conversation. */
  childOptions: ChildOption[];
  /** Preselected (new conversation) or attached (existing one) child. */
  child: ChildOption | null;
  /** Episode in progress of the preselected child: sent as context, help asked on arrival. */
  liveEpisode?: { id: string; kind: string } | null;
  /** Called once the server has created the conversation (first question). */
  onConversation?: (id: string) => void;
  /** Called after each answer (or failure), e.g. to refresh the history list. */
  onAnswered?: () => void;
};

/** The answer being streamed: finished assistant messages + the text still arriving. */
type Pending = { parts: AnswerPart[]; live: string; searches: string[] };

/** The chat itself (messages, composer, child context); it fills its container, which is the Amit panel. */
export function ChatView({ conversationId: initialId, initialTurns, childOptions, child, liveEpisode = null, onConversation, onAnswered }: ChatViewProps) {
  const { t, childName } = useI18n();
  const e = t.expert;

  const [conversationId, setConversationId] = useState(initialId);
  const [turns, setTurns] = useState<DisplayTurn[]>(initialTurns);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [childId, setChildId] = useState<string | null>(child?.id ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [, startPreview] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const autoAsked = useRef(false);

  const isNew = conversationId === null;
  const busy = pending !== null;
  const attached = isNew ? childOptions.find((c) => c.id === childId) ?? null : child;
  // The episode goes with its child: picking another child drops it.
  const episodeId = isNew && liveEpisode && childId === child?.id ? liveEpisode.id : null;

  // Load the exact context that will be shared, whenever the picked child changes.
  useEffect(() => {
    if (!isNew || !childId) return;
    let cancelled = false;
    startPreview(async () => {
      const text = await previewChildContext(childId, episodeId);
      if (!cancelled) setPreview(text);
    });
    return () => {
      cancelled = true;
    };
  }, [childId, episodeId, isNew]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending?.live, pending?.parts.length, pending?.searches.length]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    setTurns((ts) => [...ts, { role: "user", text }]);
    const state: Pending = { parts: [], live: "", searches: [] };
    setPending({ ...state });

    let failed: string | null = null;
    try {
      const res = await fetch("/api/expert/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message: text, childId: isNew ? childId : null, episodeId }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseEvents(buffer);
        buffer = rest;
        for (const ev of events) {
          switch (ev.type) {
            case "conversation":
              setConversationId(ev.id);
              onConversation?.(ev.id);
              break;
            case "search":
              state.searches.push(ev.query);
              break;
            case "text":
              state.live += ev.text;
              break;
            case "message":
              state.parts.push(...ev.parts);
              state.live = "";
              break;
            case "refusal":
              failed = e.errors.refusal;
              break;
            case "error":
              failed = e.errors[ev.code] ?? e.errors.generic;
              break;
          }
        }
        setPending({ ...state, searches: [...state.searches] });
      }
    } catch {
      failed = e.errors.generic;
    }

    const answerParts = state.parts;
    setTurns((ts) => (answerParts.length ? [...ts, { role: "assistant", parts: answerParts }] : ts));
    setPending(null);
    if (failed) setError(failed);
    onAnswered?.();
  }

  // Coming from an episode in progress: ask for help right away (once, even under Strict Mode).
  useEffect(() => {
    if (!liveEpisode || autoAsked.current) return;
    autoAsked.current = true;
    ask(e.askHelp[liveEpisode.kind] ?? e.askHelp.crisis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingAnswer = useMemo(() => (pending ? buildAnswer(pending.parts) : null), [pending]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {/* A readable column when the panel is expanded. */}
        <div className="mx-auto max-w-3xl space-y-4">
          {/* New conversations show the picker below instead. */}
          {!isNew && attached && (
            <p className="w-fit rounded-full bg-warn px-3 py-1 text-[12px] text-warn-ink">
              {e.contextBadge("")}
              <bdi>{childName(attached)}</bdi>
            </p>
          )}
          {turns.length === 0 && !pending && <p className="text-[13px] leading-relaxed text-ink-muted">{e.subtitle}</p>}
          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p
                  dir="auto"
                  className="max-w-[85%] rounded-2xl rounded-ee-md bg-primary px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-line text-white"
                >
                  {turn.text}
                </p>
              </div>
            ) : (
              <div key={i} className="max-w-[92%] rounded-2xl rounded-es-md bg-surface-muted px-4 py-3">
                <AnswerView answer={buildAnswer(turn.parts)} answerId={`a${i}`} />
              </div>
            ),
          )}

          {pending && (
            <div className="max-w-[92%] space-y-2 rounded-2xl rounded-es-md bg-surface-muted px-4 py-3">
              {pending.searches.map((q, i) => (
                <p key={i} className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                  <Search className="size-3.5" />
                  <bdi>{e.searching(q)}</bdi>
                </p>
              ))}
              {pendingAnswer && (pendingAnswer.markdown || pendingAnswer.sources.length > 0) && <AnswerView answer={pendingAnswer} answerId="pending" />}
              {pending.live && (
                <p dir="auto" className="text-[14px] leading-relaxed whitespace-pre-line text-ink">
                  {stripMarkers(pending.live)}
                </p>
              )}
              {!pending.live && (
                <p className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                  <Loader2 className="size-3.5 animate-spin" />
                  {e.thinking}
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-warn-ink/20 bg-warn px-3 py-2 text-[13px] text-warn-ink">
              {error}
            </p>
          )}
          <div ref={bottom} />
        </div>
      </div>

      <div className="border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-3xl space-y-2.5">
          {isNew && childOptions.length > 0 && (
            <div className="space-y-2">
              <label className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
                {e.context}
                <select
                  value={childId ?? ""}
                  onChange={(ev) => {
                    setChildId(ev.target.value || null);
                    setPreview(null);
                  }}
                  className="h-10 rounded-xl border border-line-strong bg-surface px-2.5 text-[14px]"
                >
                  <option value="">{e.noContext}</option>
                  {childOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {childName(c)}
                    </option>
                  ))}
                </select>
                {childId && (
                  <button type="button" onClick={() => setShowPreview((s) => !s)} className="inline-flex min-h-10 items-center gap-1 text-[13px] text-primary">
                    {e.contextPreview}
                    <ChevronDown className={clsx("size-3.5 transition-transform", showPreview && "rotate-180")} />
                  </button>
                )}
              </label>
              {childId && showPreview && (
                <div className="rounded-lg bg-surface-muted px-3 py-2">
                  <p className="mb-1 flex items-center gap-1 text-[11.5px] text-ink-muted">
                    <Info className="size-3.5" />
                    {e.contextHint}
                  </p>
                  <pre dir="auto" className="text-[12px] whitespace-pre-wrap text-ink-soft">
                    {preview ?? "…"}
                  </pre>
                </div>
              )}
            </div>
          )}

          {turns.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {e.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="min-h-10 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-start text-[13.5px] text-ink-soft hover:bg-surface-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              ask(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              dir="auto"
              value={input}
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && !ev.shiftKey) {
                  ev.preventDefault();
                  ask(input);
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder={e.placeholder}
              aria-label={e.placeholder}
              className="min-h-11 flex-1 resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label={e.send}
              className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </form>
          {attached && <NameWarning text={input} childName={attached.name} replaced />}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11.5px] text-ink-muted">{e.guardrail}</p>
            <PrivacyBadge />
          </div>
        </div>
      </div>
    </div>
  );
}
