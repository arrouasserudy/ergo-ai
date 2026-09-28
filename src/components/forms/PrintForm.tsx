"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import type { Answers, FormSchema } from "@/lib/forms/schema";
import { FormRenderer } from "./FormRenderer";

type Props = { form: FormSchema; answers: Answers; letterhead: string[]; meta: string[]; fileName: string };

/** "Print / PDF": the filled form with the letterhead, printed alone (see .print-root in globals.css). */
export function PrintForm({ form, answers, letterhead, meta, fileName }: Props) {
  const { t } = useI18n();
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    // The page title becomes the suggested PDF file name.
    const title = document.title;
    document.title = fileName;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    return () => {
      document.title = title;
      window.removeEventListener("afterprint", done);
    };
  }, [printing, fileName]);

  return (
    <>
      <Button variant="secondary" onClick={() => setPrinting(true)}>
        <Printer className="size-4" />
        {t.forms.print}
      </Button>
      {printing &&
        createPortal(
          <div className="print-root font-sans text-[10.5pt] leading-relaxed text-black" dir={form.language === "he" ? "rtl" : "ltr"}>
            {letterhead.length > 0 && (
              <header className="mb-6 border-b border-neutral-300 pb-3">
                {letterhead.map((line, i) => (
                  <p key={i} className={i === 0 ? "text-[12pt] font-semibold" : "text-[9pt] text-neutral-600"}>
                    {line}
                  </p>
                ))}
              </header>
            )}
            <div className="mb-4 text-[10pt]">
              {meta.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <FormRenderer form={form} answers={answers} mode="print" idPrefix="print" />
          </div>,
          document.body,
        )}
    </>
  );
}
