"use client";

import { Check, Copy, Link2, Link2Off, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { ShareLinkResult } from "@/app/actions/child-forms";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

/**
 * `create` / `revoke`: server actions bound to the form or test; `path`: public route of
 * the link ("/f/"). `activeUntil`: expiry of the current link, null when there is none (or it expired).
 */
type Props = {
  create: () => Promise<ShareLinkResult>;
  revoke: () => Promise<void>;
  path: string;
  activeUntil: string | null;
  submitted: boolean;
  hint?: string;
};

/** Creates, shows once and disables the private link sent to the parents. */
export function SharePanel({ create: createLink, revoke, path, activeUntil, submitted, hint }: Props) {
  const i18n = useI18n();
  const s = i18n.t.forms.share;
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const active = activeUntil !== null;

  const create = () =>
    startTransition(async () => {
      setError(false);
      const result = await createLink();
      if (result.ok) setUrl(`${window.location.origin}${path}${result.token}`);
      else setError(true);
    });

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-ink-muted">{hint ?? s.hint}</p>
      {url && (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-tint p-3">
          <input
            readOnly
            dir="ltr"
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 w-full rounded-md border border-line-strong bg-surface px-2 font-mono text-[12px]"
          />
          <Button size="sm" onClick={copy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? s.copied : s.copy}
          </Button>
          <p className="text-[12px] text-tint-ink">{s.shownOnce}</p>
        </div>
      )}
      <p className="text-[13px] text-ink-soft">{active ? s.active(i18n.date(activeUntil)) : s.none}</p>
      {submitted && active && <p className="text-[12.5px] text-ink-muted">{s.submittedNote}</p>}
      {error && <p className="text-[12px] text-danger">{i18n.t.forms.errors.generic}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={pending} onClick={create}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
          {active ? s.renew : s.create}
        </Button>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await revoke();
                setUrl(null);
              })
            }
          >
            <Link2Off className="size-3.5" />
            {s.revoke}
          </Button>
        )}
      </div>
    </div>
  );
}
