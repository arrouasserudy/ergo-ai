import { AlertCircle } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-2 rounded-lg border border-warn-ink/20 bg-warn px-3 py-2 text-[13px] text-warn-ink">
      <AlertCircle className="size-4 shrink-0" />
      {message}
    </p>
  );
}
