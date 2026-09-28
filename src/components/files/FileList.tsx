import { Download, FileText, Image as ImageIcon } from "lucide-react";
import { deleteChildFile } from "@/app/actions/files";
import { Badge } from "@/components/ui/Badge";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import type { ChildFile } from "@/db/schema";
import { getI18n } from "@/i18n/server";

const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** The forms filed in a child's record, newest first. */
export async function FileList({ files }: { files: ChildFile[] }) {
  const i18n = await getI18n();
  const f = i18n.t.files;
  if (files.length === 0) return <p className="px-5 pb-5 text-[13px] text-ink-muted">{f.none}</p>;

  return (
    <ul className="divide-y divide-line border-t border-line">
      {files.map((file) => {
        const Icon = file.mimeType.startsWith("image/") ? ImageIcon : FileText;
        return (
          <li key={file.id} className="flex items-center gap-3 px-5 py-3">
            <Icon className="size-4 shrink-0 text-ink-muted" />
            <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" className="min-w-0 flex-1 hover:underline">
              <bdi className="block truncate text-[14px] font-medium">{file.title}</bdi>
              <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-muted">
                <Badge tone="muted">{f.kind[file.kind]}</Badge>
                {i18n.date(file.formDate ?? file.createdAt.toISOString())} · {sizeLabel(file.sizeBytes)}
              </span>
            </a>
            <a href={`/api/files/${file.id}?download`} aria-label={f.download} title={f.download} className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-surface-muted">
              <Download className="size-4" />
            </a>
            <ConfirmButton action={deleteChildFile.bind(null, file.id)} label={f.delete} confirmLabel={f.confirmDelete} />
          </li>
        );
      })}
    </ul>
  );
}
