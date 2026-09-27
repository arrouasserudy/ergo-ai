"use client";

import { Check, Copy, Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { InputField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { buildExportDocument, type ExportDocument, type ExportInput } from "@/lib/reports/export-document";
import { parseBody, sectionsToPlainText, type Inline } from "@/lib/reports/text";

type Kind = "pdf" | "word" | "copy";

/**
 * First name + export buttons, under a validated version. The name only lives in
 * this component's state: it is substituted in the browser and never sent anywhere.
 */
export function ExportBar({
  input,
  nameHint,
  disabled,
  onExported,
}: {
  input: Omit<ExportInput, "firstName">;
  /** The child's name as displayed (masked in hidden mode); `input.name` stays the real one for the export. */
  nameHint: string;
  disabled: boolean;
  onExported: () => void;
}) {
  const { t } = useI18n();
  const r = t.reports;
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState<Kind | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState<ExportDocument | null>(null);

  // Print once the document is in the DOM; the print stylesheet shows only it.
  useEffect(() => {
    if (!printing) return;
    // The page title becomes the suggested PDF file name.
    const title = document.title;
    document.title = printing.fileName;
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    return () => {
      document.title = title;
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  const run = async (kind: Kind) => {
    setBusy(kind);
    setError(null);
    const doc = buildExportDocument({ ...input, firstName });
    try {
      if (kind === "pdf") {
        setPrinting(doc);
      } else if (kind === "word") {
        const { buildDocx } = await import("@/lib/reports/docx");
        const blob = await buildDocx(doc);
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: `${doc.fileName}.docx` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        await navigator.clipboard.writeText(sectionsToPlainText(doc.sections));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      onExported();
    } catch {
      setError(r.errors.exportFailed);
    }
    setBusy(null);
  };

  return (
    <div className="space-y-3">
      <InputField
        name="exportFirstName"
        label={r.firstName}
        help={r.firstNameHelp}
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        autoComplete="off"
        maxLength={60}
        placeholder={nameHint}
        disabled={disabled}
      />
      <FormError message={error ?? undefined} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => run("pdf")} disabled={disabled || busy !== null}>
          {busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {r.exportPdf}
        </Button>
        <Button variant="secondary" onClick={() => run("word")} disabled={disabled || busy !== null}>
          {busy === "word" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          {r.exportWord}
        </Button>
        <Button variant="secondary" onClick={() => run("copy")} disabled={disabled || busy !== null}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? r.copied : r.copy}
        </Button>
      </div>
      {printing && createPortal(<PrintDocument doc={printing} />, document.body)}
    </div>
  );
}

function Runs({ inlines }: { inlines: Inline[] }) {
  return inlines.map((i, k) => (i.bold ? <strong key={k}>{i.text}</strong> : <span key={k}>{i.text}</span>));
}

/** The exported report as printed ("Save as PDF"). Hidden on screen; see .print-root in globals.css. */
function PrintDocument({ doc }: { doc: ExportDocument }) {
  return (
    <div className="print-root font-sans text-[11pt] leading-relaxed text-black" dir={doc.dir} lang={doc.lang}>
      <header className="mb-6 border-b border-neutral-300 pb-3">
        {doc.letterhead.map((line, i) => (
          <p key={i} className={i === 0 ? "text-[12pt] font-semibold" : "text-[9pt] text-neutral-600"}>
            {line}
          </p>
        ))}
      </header>
      <h1 className="font-serif text-[20pt] leading-tight">{doc.title}</h1>
      <p className="mt-1 text-neutral-700">{doc.to}</p>
      <div className="mt-2 mb-6 text-[10pt]">
        {doc.meta.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {doc.sections.map((section, i) => (
        <section key={i} className="mb-4 break-inside-avoid-page">
          {section.heading && <h2 className="mb-1 font-serif text-[13pt] font-semibold">{section.heading}</h2>}
          {parseBody(section.body).map((block, k) =>
            block.type === "paragraph" ? (
              <p key={k} className="mb-2">
                <Runs inlines={block.inlines} />
              </p>
            ) : (
              <ul key={k} className="mb-2 list-disc ps-6">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Runs inlines={item} />
                  </li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
      <footer className="mt-10 text-end">
        {doc.signature.map((line, i) => (
          <p key={i} className={i === 0 ? "font-semibold" : "text-neutral-600"}>
            {line}
          </p>
        ))}
      </footer>
    </div>
  );
}
