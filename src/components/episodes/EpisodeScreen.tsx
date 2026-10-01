"use client";

import clsx from "clsx";
import { Check, ChevronDown, CircleAlert, Info, Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteEpisode, finishEpisode, saveEpisode } from "@/app/actions/episodes";
import { AmitAvatar } from "@/components/expert/AmitAvatar";
import { openAmit } from "@/components/expert/amit-store";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipPicker } from "@/components/ui/ChipPicker";
import { SaveIndicator, type SaveState } from "@/components/ui/SaveIndicator";
import type { Episode } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { SITUATION_OPTIONS } from "@/lib/episode-catalog";
import { rankCauses, type CauseSource } from "@/lib/episode-insights";
import type { EpisodeInput } from "@/lib/validation";

type HistoryItem = Pick<Episode, "kind" | "situation" | "causes" | "helped" | "startedAt">;
type Profile = { hyperSensitivities: string[]; hypoReactivities: string[]; backgroundFactors: string[]; seeksDeepPressure: boolean };

type EpisodeScreenProps = {
  episode: Episode;
  child: { id: string; knownTriggers: string | null };
  profile: Profile;
  /** Other episodes of this child, used to order the check-list. */
  history: HistoryItem[];
  helpedOptions: string[];
  /** Meta line for a closed episode (date · duration). */
  closedMeta?: string;
  historyPanel: ReactNode;
};

export function EpisodeScreen({ episode, child, profile, history, helpedOptions, closedMeta, historyPanel }: EpisodeScreenProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const e = t.episodes;
  const [data, setData] = useState<EpisodeInput>({
    situation: episode.situation,
    antecedent: episode.antecedent ?? "",
    behavior: episode.behavior ?? "",
    notes: episode.notes ?? "",
    causes: episode.causes,
    helped: episode.helped,
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [finishing, startFinishing] = useTransition();
  const [asking, startAsking] = useTransition();
  const [finishError, setFinishError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const dirty = useRef(false);

  const isOpen = episode.status === "open";
  const kind = episode.kind;

  const update = (patch: Partial<EpisodeInput>) => {
    dirty.current = true;
    setFinishError(null);
    setData((d) => ({ ...d, ...patch }));
  };

  // Autosave shortly after each change.
  useEffect(() => {
    if (!dirty.current) return;
    const id = setTimeout(async () => {
      setSaveState("saving");
      try {
        const result = await saveEpisode(episode.id, data);
        setSaveState(result.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 700);
    return () => clearTimeout(id);
  }, [data, episode.id]);

  const { main, more } = useMemo(
    () => rankCauses({ history, profile, kind, situation: data.situation ?? null }),
    [history, profile, kind, data.situation],
  );

  const toggleCause = (key: string) =>
    update({ causes: data.causes.includes(key) ? data.causes.filter((c) => c !== key) : [...data.causes, key] });

  // Checked causes that are not in the ranked lists (custom ones typed now).
  const listed = new Set([...main.map((c) => c.key), ...more.flatMap((g) => g.keys)]);
  const customCauses = data.causes.filter((c) => !listed.has(c));

  const finish = () =>
    startFinishing(async () => {
      if (kind === "difficulty" && !data.situation) {
        setFinishError(e.situationRequired);
        return;
      }
      const result = await finishEpisode(episode.id, data);
      if (result && !result.ok) setFinishError(t.errors.generic);
    });

  // Save what was just checked (the autosave may still be pending) so Amit sees it.
  const askAmit = () =>
    startAsking(async () => {
      if (dirty.current) await saveEpisode(episode.id, data).catch(() => null);
      openAmit({ kind: "new", childId: child.id, episodeId: episode.id });
    });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {/* The child's name is the page title, in the child layout's header. */}
          {isOpen ? (
            <div className="flex flex-wrap items-center gap-2">
              <LiveBadge kind={kind} startedAt={episode.startedAt} />
              <span className="text-[12px] text-ink-muted">{e.liveHint}</span>
            </div>
          ) : (
            <>
              <h2 className="text-[20px] leading-tight font-semibold tracking-tight">{e.kind[kind]}</h2>
              {closedMeta && <p className="mt-1 text-[13px] text-ink-muted">{closedMeta}</p>}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SaveIndicator state={saveState} />
          {isOpen && (
            <Button variant="secondary" onClick={askAmit} disabled={asking}>
              {asking ? <Loader2 className="size-4 animate-spin" /> : <AmitAvatar size={20} />}
              {e.askAmit}
            </Button>
          )}
          {isOpen && (
            <LinkButton href={`/children/${child.id}`} variant="secondary">
              {e.later}
            </LinkButton>
          )}
          <Button onClick={finish} disabled={finishing}>
            {finishing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {isOpen ? e.finish[kind] : t.common.save}
          </Button>
        </div>
      </header>

      {finishError && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-warn-ink/20 bg-warn px-3 py-2 text-[13px] text-warn-ink">
          <CircleAlert className="size-4 shrink-0" />
          {finishError}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          {kind === "difficulty" && (
            <Card>
              <CardHeader title={e.situationLabel} hint={e.situationHint} />
              <div className="px-5 pb-5">
                <ChipPicker
                  single
                  options={SITUATION_OPTIONS}
                  value={data.situation ? [data.situation] : []}
                  onChange={(v) => update({ situation: v[0] ?? null })}
                  labelOf={i18n.situation}
                  customPlaceholder={e.customSituation}
                />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title={e.checklistTitle} hint={e.checklistHint} />
            <div className="space-y-4 px-5 pb-5">
              {child.knownTriggers && (
                <p className="rounded-lg bg-tint px-3 py-2 text-[12.5px] text-tint-ink">
                  <span className="font-medium">{e.knownTriggers} </span>
                  <bdi>{child.knownTriggers}</bdi>
                </p>
              )}

              <ul className="space-y-2">
                {main.map(({ key, source }) => (
                  <CauseRow key={key} causeKey={key} source={source} checked={data.causes.includes(key)} onToggle={() => toggleCause(key)} />
                ))}
                {customCauses.map((key) => (
                  <CauseRow key={key} causeKey={key} checked onToggle={() => toggleCause(key)} />
                ))}
              </ul>

              <p className="flex gap-2 text-[12px] leading-relaxed text-ink-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {e.bodyReminder}
              </p>

              <div className="rounded-xl border border-line">
                <button
                  type="button"
                  onClick={() => setShowMore((s) => !s)}
                  aria-expanded={showMore}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-medium text-ink-soft"
                >
                  {e.moreCauses}
                  <ChevronDown className={clsx("size-4 transition-transform", showMore && "rotate-180")} />
                </button>
                {showMore && (
                  <div className="space-y-4 border-t border-line px-3 py-3">
                    {more.map(({ group, keys }) => (
                      <div key={group}>
                        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-ink-muted uppercase">{e.groups[group]}</p>
                        <ChipPicker
                          options={keys}
                          value={data.causes.filter((c) => keys.includes(c))}
                          onChange={(v) => update({ causes: [...data.causes.filter((c) => !keys.includes(c)), ...v] })}
                          labelOf={i18n.cause}
                          allowCustom={false}
                        />
                      </div>
                    ))}
                    <div>
                      <ChipPicker
                        options={[]}
                        value={[]}
                        onChange={(v) => update({ causes: [...new Set([...data.causes, ...v])] })}
                        customPlaceholder={e.customCause}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[12.5px] font-medium text-ink-soft">{e.helped[kind]}</p>
                <ChipPicker options={helpedOptions} value={data.helped} onChange={(v) => update({ helped: v })} labelOf={i18n.tag} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <TextArea label={e.antecedent} placeholder={e.antecedentPlaceholder} value={data.antecedent ?? ""} onChange={(v) => update({ antecedent: v })} />
              <TextArea label={e.behavior[kind]} placeholder={e.behaviorPlaceholder} value={data.behavior ?? ""} onChange={(v) => update({ behavior: v })} />
              <TextArea
                label={e.notes}
                placeholder={e.notesPlaceholder}
                value={data.notes ?? ""}
                onChange={(v) => update({ notes: v })}
                className="sm:col-span-2"
              />
            </div>
          </Card>

          <div className="flex justify-end">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  {t.common.cancel}
                </Button>
                <form action={deleteEpisode.bind(null, episode.id)}>
                  <Button type="submit" size="sm" variant="secondary" className="border-danger/40 text-danger">
                    <Trash2 className="size-3.5" />
                    {e.confirmDelete}
                  </Button>
                </form>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-3.5" />
                {e.delete}
              </Button>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-6">{historyPanel}</div>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: CauseSource }) {
  const e = useI18n().t.episodes;
  switch (source.type) {
    case "history":
      return <Badge tone="warn">{e.source.history(source.count)}</Badge>;
    case "interview":
      return <Badge tone="muted">{e.source.interview}</Badge>;
    case "situation":
      return <Badge tone="tint">{e.source.situation}</Badge>;
    default:
      return <Badge tone="ok">{e.source.general}</Badge>;
  }
}

function CauseRow({ causeKey, source, checked, onToggle }: { causeKey: string; source?: CauseSource; checked: boolean; onToggle: () => void }) {
  const info = useI18n().t.causes[causeKey];
  return (
    <li>
      <label
        className={clsx(
          "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
          checked ? "border-primary/40 bg-tint" : "border-line bg-surface-muted hover:border-line-strong",
        )}
      >
        <input type="checkbox" checked={checked} onChange={onToggle} className="size-5 shrink-0 accent-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium text-ink">{info?.label ?? causeKey}</span>
          {info?.hint && <span className="block text-[12px] text-ink-muted">{info.hint}</span>}
        </span>
        {source && (
          <span className="shrink-0">
            <SourceBadge source={source} />
          </span>
        )}
      </label>
    </li>
  );
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={clsx("flex flex-col gap-1.5", className)}>
      <span className="text-[12.5px] font-medium text-ink-soft">{label}</span>
      <textarea
        dir="auto"
        rows={2}
        value={value}
        placeholder={placeholder}
        maxLength={1000}
        onChange={(ev) => onChange(ev.target.value)}
        className="w-full resize-y rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] leading-relaxed placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
      />
    </label>
  );
}

/** "● Crise en cours · 4 min", ticking every 30 s. */
function LiveBadge({ kind, startedAt }: { kind: string; startedAt: Date }) {
  const e = useI18n().t.episodes;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const minutes = now === null ? null : Math.max(0, Math.floor((now - startedAt.getTime()) / 60_000));

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warn px-2.5 py-1 text-[12px] font-medium text-warn-ink">
      <span className="size-1.5 animate-pulse rounded-full bg-warn-ink" />
      {e.inProgress[kind]}
      {minutes !== null && ` · ${e.minutes(minutes)}`}
    </span>
  );
}
