"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { EVENTS, isEventName, type EventName } from "@/lib/analytics/events";
import { routeOf } from "@/lib/analytics/routes";

type QueuedEvent = { kind: "page" | "event"; name: string };

const FLUSH_MS = 10_000;
const TRACK_EVENT = "usage:track";

/** For uses that are not a click (a select, a keyboard shortcut): records a client event. */
export function trackEvent(name: EventName) {
  window.dispatchEvent(new CustomEvent(TRACK_EVENT, { detail: name }));
}

/**
 * Internal usage analytics (admin page /admin/usage): records each page view as its route
 * pattern (never the real URL) and clicks on elements marked `data-track="<event>"`, then
 * sends them in batches to /api/track. Renders nothing.
 */
export function UsageTracker() {
  const pathname = usePathname();
  const queue = useRef<QueuedEvent[]>([]);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    const route = routeOf(pathname);
    if (route) queue.current.push({ kind: "page", name: route });
  }, [pathname]);

  useEffect(() => {
    const flush = (leaving = false) => {
      if (!queue.current.length) return;
      const body = JSON.stringify({ events: queue.current.splice(0, 50) });
      // sendBeacon survives the tab closing; fetch otherwise (keepalive for the same reason).
      if (leaving && navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    };

    const push = (name: unknown) => {
      if (isEventName(name) && EVENTS[name].source === "client") queue.current.push({ kind: "event", name });
    };
    const onClick = (event: MouseEvent) => push((event.target as Element | null)?.closest?.("[data-track]")?.getAttribute("data-track"));
    const onTrack = (event: Event) => push((event as CustomEvent).detail);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const leave = () => flush(true);

    const timer = setInterval(flush, FLUSH_MS);
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener(TRACK_EVENT, onTrack);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", leave);
    return () => {
      clearInterval(timer);
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener(TRACK_EVENT, onTrack);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", leave);
      flush(true);
    };
  }, []);

  return null;
}
