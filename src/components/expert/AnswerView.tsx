"use client";

import { CircleAlert, ExternalLink } from "lucide-react";
import Markdown, { type Components } from "react-markdown";
import { useI18n } from "@/i18n/client";
import type { Answer } from "@/lib/expert/display";

/** Scoped ids so two answers on the page don't share anchors. */
const anchor = (answerId: string, n: number) => `${answerId}-src-${n}`;

function markdownComponents(answerId: string, label: (n: number) => string): Components {
  return {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 ps-5">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 ps-5">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
    h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
    h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
    a: ({ href, children }) => {
      const cite = href?.match(/^#cite-(\d+)$/);
      if (cite) {
        const n = Number(cite[1]);
        return (
          <a
            href={`#${anchor(answerId, n)}`}
            aria-label={label(n)}
            className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-tint px-1 align-[1px] text-[11px] font-medium text-tint-ink no-underline hover:bg-primary hover:text-white"
          >
            {n}
          </a>
        );
      }
      return (
        <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
          {children}
        </a>
      );
    },
  };
}

/** An assistant answer: markdown with citation chips, the limits box and the numbered sources. */
export function AnswerView({ answer, answerId }: { answer: Answer; answerId: string }) {
  const { t } = useI18n();
  const e = t.expert;
  const components = markdownComponents(answerId, e.reference);

  return (
    <div className="space-y-3">
      {answer.markdown && (
        <div dir="auto" className="text-[14px] leading-relaxed text-ink">
          <Markdown components={components}>{answer.markdown}</Markdown>
        </div>
      )}

      {answer.limits && (
        <div className="flex gap-2 rounded-lg border border-warn-ink/20 bg-warn px-3 py-2.5 text-[13px] text-warn-ink">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div dir="auto">
            <span className="font-semibold">{e.limitsTitle} : </span>
            <Markdown components={{ ...components, p: ({ children }) => <span>{children}</span> }}>{answer.limits}</Markdown>
          </div>
        </div>
      )}

      {answer.sources.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-[0.1em] text-ink-muted uppercase">{e.sources}</p>
          <ol className="space-y-1.5">
            {answer.sources.map((s) => (
              <li key={s.n} id={anchor(answerId, s.n)} className="scroll-mt-24 rounded-lg border border-line bg-surface-muted target:border-primary/50 target:bg-tint">
                <details>
                  <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2 text-[12.5px]">
                    <span className="mt-px inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-tint px-1 text-[11px] font-medium text-tint-ink">
                      {s.n}
                    </span>
                    <bdi className="text-ink-soft">{s.title}</bdi>
                  </summary>
                  <div className="space-y-2 border-t border-line px-3 py-2.5">
                    {s.passages.map((p, i) => (
                      <blockquote key={i} dir="ltr" className="border-s-2 border-primary/40 ps-3 text-[12.5px] leading-relaxed text-ink-soft">
                        {p}
                      </blockquote>
                    ))}
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
                      {e.openSource}
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
