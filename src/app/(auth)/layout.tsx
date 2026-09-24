import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { t } from "@/i18n/fr";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-primary text-white">
          <FileText className="size-5" strokeWidth={2} />
        </span>
        <span className="font-serif text-3xl font-medium">{t.app.name}</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 max-w-sm text-center text-[12px] text-ink-muted">{t.app.privacyNote}</p>
    </div>
  );
}
