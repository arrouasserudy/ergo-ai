import clsx from "clsx";
import { FileText, Trash2 } from "lucide-react";
import { deleteDocument, listDocuments } from "@/app/actions/library";
import { UploadForm } from "@/components/expert/UploadForm";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { openLibrary } from "@/db/library";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.expert.library.title} · ${t.app.name}` };
}

function sharedArticleCount(): number | null {
  const library = openLibrary();
  if (!library) return null;
  const row = library.prepare("SELECT COUNT(*) AS n FROM documents").get() as { n: number };
  return row.n;
}

export default async function LibraryPage(props: PageProps<"/expert/library">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const l = t.expert.library;
  const docs = await listDocuments();
  const shared = sharedArticleCount();
  const highlight = (await props.searchParams).doc;

  return (
    <div className="space-y-5">
      <header>
        <Eyebrow>{t.nav.expert}</Eyebrow>
        <h1 className="mt-1 text-[24px] leading-tight font-semibold tracking-tight">{l.title}</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{l.subtitle}</p>
        <p className="mt-1 text-[12.5px] text-ink-muted">{shared ? l.shared(shared) : l.noShared}</p>
      </header>

      <Card>
        <CardHeader title={l.uploadTitle} />
        <div className="px-5 pb-5">
          <UploadForm />
        </div>
      </Card>

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
    </div>
  );
}
