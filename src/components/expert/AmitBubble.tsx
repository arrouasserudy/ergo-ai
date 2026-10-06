"use client";

import clsx from "clsx";
import { ArrowLeft, History, Library, Loader2, Maximize2, Minimize2, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { listMyConversations, newChatSetup, openConversation, type NewChatSetup } from "@/app/actions/expert";
import { useI18n } from "@/i18n/client";
import type { DisplayTurn } from "@/lib/expert/display";
import { AmitAvatar } from "./AmitAvatar";
import { onAmitRequest, openAmit, type AmitRequest } from "./amit-store";
import { ChatView } from "./ChatView";

/** One mounted chat: replaced only on an explicit action, so the first question's new id doesn't remount it. */
type Session = NewChatSetup & {
  key: number;
  conversationId: string | null;
  turns: DisplayTurn[];
};

/** `expanded`: the larger panel on wide screens (phones are always full-screen). */
type Stored = {
  open: boolean;
  conversationId: string | null;
  expanded?: boolean;
};
const STORAGE_KEY = "amit.bubble";

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStored(value: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: the bubble simply starts closed next time.
  }
}

/** The child whose pages are being viewed (`/children/[id]/...`), preselected as context. */
function childIdOf(pathname: string): string | null {
  return pathname.match(/^\/children\/([^/]+)/)?.[1] ?? null;
}

/** Amit, the expert colleague: a floating button on every app page that opens the chat in a panel. */
export function AmitBubble() {
  const { t } = useI18n();
  const e = t.expert;
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [session, setSession] = useState<Session | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const nextKey = useRef(0);
  const requested = useRef(false);
  /** What was in storage on mount (undefined until read): nothing is written before that. */
  const stored = useRef<Stored | null | undefined>(undefined);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const pageChildId = childIdOf(pathname);

  const startNew = useCallback(async (childId: string | null, episodeId: string | null = null) => {
    setLoading(true);
    setView("chat");
    setOpen(true);
    try {
      const setup = await newChatSetup(childId, episodeId);
      setSession({
        ...setup,
        key: ++nextKey.current,
        conversationId: null,
        turns: [],
      });
      setActiveId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const openExisting = useCallback(
    async (id: string) => {
      setLoading(true);
      setView("chat");
      setOpen(true);
      try {
        const conversation = await openConversation(id);
        if (!conversation) return void (await startNew(null));
        setSession({
          key: ++nextKey.current,
          conversationId: conversation.id,
          turns: conversation.turns,
          child: conversation.child,
          childOptions: [],
          liveEpisode: null,
        });
        setActiveId(conversation.id);
      } finally {
        setLoading(false);
      }
    },
    [startNew],
  );

  const refreshList = useCallback(() => {
    listMyConversations()
      .then(setConversations)
      .catch(() => null);
  }, []);

  // Requests from the rest of the app ("Ask Amit" buttons, episode in progress, old /expert links).
  useEffect(
    () =>
      onAmitRequest((request: AmitRequest) => {
        requested.current = true;
        if (request.kind === "conversation") openExisting(request.id);
        else startNew(request.childId ?? null, request.episodeId ?? null);
      }),
    [openExisting, startNew],
  );

  // After a reload: reopen as it was (a per-viewer convenience).
  useEffect(() => {
    if (stored.current !== undefined) return;
    const last = (stored.current = readStored());
    if (last?.expanded) startTransition(() => setExpanded(true));
    // An explicit request (e.g. a link with ?amit=) wins over the remembered state.
    if (!last || requested.current) return;
    if (last.open) {
      if (last.conversationId) openExisting(last.conversationId);
      else startNew(childIdOf(window.location.pathname));
    } else if (last.conversationId) {
      // Reopened later from the button.
      startTransition(() => setActiveId(last.conversationId));
    }
  }, [openExisting, startNew]);

  useEffect(() => {
    if (stored.current !== undefined) writeStored({ open, conversationId: activeId, expanded });
  }, [open, activeId, expanded]);

  function show() {
    // An untouched new chat follows the page: on a child's page, that child is preselected.
    const untouched = !session || (session.conversationId === null && activeId === null && !session.liveEpisode);
    if (!session && activeId) openExisting(activeId);
    else if (!session || (untouched && (session.child?.id ?? null) !== pageChildId)) startNew(pageChildId);
    else setOpen(true);
  }

  const hide = useCallback(() => {
    setOpen(false);
    toggle.current?.focus();
  }, []);

  // Focus on open: the composer on larger screens, the panel itself on phones (no keyboard popping up).
  useEffect(() => {
    if (!open || loading) return;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const target = wide ? panel.current?.querySelector<HTMLElement>(view === "chat" ? "textarea" : "button") : panel.current;
    target?.focus();
  }, [open, loading, view, session?.key]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hide]);

  useEffect(() => {
    if (open && view === "history") refreshList();
  }, [open, view, refreshList]);

  const iconButton = "grid size-10 shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink";

  return (
    <div className="print:hidden">
      <Suspense>
        <AmitUrlRequests />
      </Suspense>

      <div
        ref={panel}
        role="dialog"
        aria-label={e.title}
        tabIndex={-1}
        className={clsx(
          "fixed inset-0 z-50 flex-col bg-surface pt-[env(safe-area-inset-top)] text-ink outline-none",
          "md:inset-auto md:end-4 md:bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] md:z-40 md:max-h-[calc(100dvh-7rem)] md:max-w-[calc(100vw-2rem)] md:overflow-hidden md:rounded-2xl md:border md:border-line md:pt-0 md:shadow-pop",
          "motion-safe:md:transition-[width,height] motion-safe:md:duration-200 motion-safe:md:ease-out",
          expanded ? "md:h-[min(85vh,calc(100dvh-10rem))] md:w-[900px]" : "md:h-[70vh] md:w-[400px]",
          open ? "flex" : "hidden",
        )}
      >
        <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          {view === "history" ? (
            <button type="button" onClick={() => setView("chat")} aria-label={t.common.back} className={iconButton}>
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </button>
          ) : (
            <AmitAvatar size={32} className="ms-1" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] leading-tight font-semibold tracking-tight">{view === "history" ? e.discussions : e.title}</p>
          </div>
          {view === "chat" && (
            <button type="button" onClick={() => setView("history")} aria-label={e.discussions} title={e.discussions} className={iconButton}>
              <History className="size-[18px]" />
            </button>
          )}
          <button type="button" onClick={() => startNew(pageChildId)} aria-label={e.newConversation} title={e.newConversation} className={iconButton}>
            <Plus className="size-[18px]" />
          </button>
          {/* Phones are full-screen already: the toggle only exists on wider screens. */}
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            aria-label={expanded ? e.collapse : e.expand}
            title={expanded ? e.collapse : e.expand}
            className={clsx(iconButton, "max-md:hidden")}
          >
            {expanded ? <Minimize2 className="size-[18px]" /> : <Maximize2 className="size-[18px]" />}
          </button>
          <button type="button" onClick={hide} aria-label={e.close} title={e.close} className={iconButton}>
            <X className="size-[18px]" />
          </button>
        </header>

        {view === "history" && (
          <nav aria-label={e.discussions} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {conversations === null ? (
              <p className="flex items-center gap-1.5 px-2 py-3 text-[13px] text-ink-muted">
                <Loader2 className="size-3.5 animate-spin" />
                {e.loading}
              </p>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-3 text-[13px] text-ink-muted">{e.noConversations}</p>
            ) : (
              <ul className="space-y-0.5">
                {conversations.map((c) => {
                  const active = c.id === activeId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        dir="auto"
                        aria-current={active ? "true" : undefined}
                        onClick={() => openExisting(c.id)}
                        className={clsx(
                          "block min-h-11 w-full truncate rounded-lg px-3 py-2.5 text-start text-[14px]",
                          active ? "bg-tint font-medium text-tint-ink" : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                        )}
                      >
                        {c.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/expert/library"
              onClick={() => setView("chat")}
              className="mt-2 flex min-h-11 items-center gap-2 rounded-lg border-t border-line px-3 py-2.5 text-[13.5px] text-primary hover:bg-surface-muted"
            >
              <Library className="size-4" />
              {t.nav.library}
            </Link>
          </nav>
        )}

        {loading && view === "chat" && (
          <p className="flex flex-1 items-center justify-center gap-1.5 text-[13px] text-ink-muted">
            <Loader2 className="size-4 animate-spin" />
            {e.loading}
          </p>
        )}

        {/* Kept mounted while hidden, so an answer keeps streaming when the panel is closed or the list shown. */}
        {session && (
          <div className={clsx("min-h-0 flex-1 flex-col", view === "chat" && !loading ? "flex" : "hidden")}>
            <ChatView
              key={session.key}
              conversationId={session.conversationId}
              initialTurns={session.turns}
              childOptions={session.childOptions}
              child={session.child}
              liveEpisode={session.liveEpisode}
              onConversation={setActiveId}
              onAnswered={refreshList}
            />
          </div>
        )}
      </div>

      <button
        ref={toggle}
        type="button"
        onClick={() => (open ? hide() : show())}
        data-track={open ? undefined : "amit.opened"}
        aria-expanded={open}
        aria-label={open ? e.close : e.askExpert}
        title={open ? e.close : e.askExpert}
        className={clsx(
          "fixed end-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 size-14 place-items-center rounded-full shadow-pop transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none",
          open ? "bg-primary text-white hover:bg-primary-hover" : "bg-surface ring-2 ring-surface",
          // Full-screen on phones: the panel has its own close button.
          open ? "hidden md:grid" : "grid",
        )}
      >
        {open ? (
          <X className="size-6" />
        ) : (
          <AmitAvatar size={56} />
        )}
      </button>
    </div>
  );
}

/** `?amit=new[&amitChild=…&amitEpisode=…]` or `?amit=<conversation id>` opens the bubble (old /expert links redirect here). */
function AmitUrlRequests() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const amit = params.get("amit");

  useEffect(() => {
    if (!amit) return;
    if (amit === "new")
      openAmit({
        kind: "new",
        childId: params.get("amitChild"),
        episodeId: params.get("amitEpisode"),
      });
    else openAmit({ kind: "conversation", id: amit });
    const rest = new URLSearchParams(params);
    for (const key of ["amit", "amitChild", "amitEpisode"]) rest.delete(key);
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [amit, params, pathname, router]);

  return null;
}
