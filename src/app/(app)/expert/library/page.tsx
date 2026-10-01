import clsx from "clsx";
import { FileText, Trash2 } from "lucide-react";
import { deleteDocument, listDocuments } from "@/app/actions/library";
import { SharedPapers } from "@/components/expert/SharedPapers";
import { UploadForm } from "@/components/expert/UploadForm";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { RevealButton, RevealPanel, RevealProvider } from "@/components/ui/RevealPanel";
import { listSharedPapers } from "@/db/library";
import { getI18n } from "@/i18n/server";
import { requireTherapist } from "@/lib/session";

const UPLOAD_PANEL_ID = "upload-document-panel";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.expert.library.title} · ${t.app.name}` };
}

export default async function LibraryPage(props: PageProps<"/expert/library">) {
  const i18n = await getI18n();
  const { t } = i18n;
  await requireTherapist();
  const l = t.expert.library;
  const docs = await listDocuments();
  const papers = listSharedPapers();
  const shared = papers?.length ?? 0;
  const highlight = (await props.searchParams).doc;

  return (
    <RevealProvider>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{l.title}</h1>
            <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{l.subtitle}</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">{shared ? l.shared(shared) : l.noShared}</p>
          </div>
          <RevealButton label={l.uploadTitle} panelId={UPLOAD_PANEL_ID} />
        </header>

        <RevealPanel title={l.uploadTitle} panelId={UPLOAD_PANEL_ID}>
          <UploadForm />
        </RevealPanel>

        <Card>
          <CardHeader title={l.documents} />
          {docs.length === 0 ? (
            <p className="px-5 pb-5 text-[13px] text-ink-muted">{l.empty}</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {docs.map((d) => (
                <li key={d.id} id={`doc-${d.id}`} className={clsx("flex items-center gap-3 px-5 py-3", highlight === d.id && "bg-tint")}>
                  <FileText className="size-4 shrink-0 text-ink-muted" />
                  <span className="min-w-0 flex-1">
                    <bdi className="block truncate text-[14px] font-medium">{d.title}</bdi>
                    <span className="block text-[12px] text-ink-muted">
                      <bdi>{d.filename}</bdi>
                      {d.pages ? ` · ${l.pages(d.pages)}` : ""} · {i18n.date(d.createdAt.toISOString())}
                    </span>
                  </span>
                  <form action={deleteDocument.bind(null, d.id)}>
                    <Button type="submit" variant="ghost" size="sm" aria-label={l.delete}>
                      <Trash2 className="size-3.5" />
                      {l.delete}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {papers && papers.length > 0 && (
          <Card>
            <CardHeader title={l.papersTitle} hint={l.papersHint(papers.length)} />
            <SharedPapers papers={papers} />
          </Card>
        )}
      </div>
    </RevealProvider>
  );
}
