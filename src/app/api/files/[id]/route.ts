import { getChildFile, opensInline, readFileBytes } from "@/lib/files";
import { getSession } from "@/lib/session";

/** Serves a form filed in a child's record, to the therapists of its cabinet only. */
export async function GET(request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });
  const file = getChildFile(session.user.accountId, (await ctx.params).id);
  const bytes = file && (await readFileBytes(file.accountId, file.id));
  if (!file || !bytes) return new Response(null, { status: 404 });

  const download = new URL(request.url).searchParams.has("download") || !opensInline(file.mimeType);
  const ascii = file.filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
