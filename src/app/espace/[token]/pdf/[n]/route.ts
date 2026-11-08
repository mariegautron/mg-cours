import { renderToBuffer } from "@react-pdf/renderer";

import { callStudentView } from "@/lib/modules/student-public";
import { ResultsDocument } from "@/lib/pdf/results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PDF d'un résultat publié, depuis l'espace personnel (même PDF que celui du lien de résultats).
 * `n` = rang (à partir de 1) dans la liste « Notes et corrigés » : plus récent d'abord. Lecture seule,
 * sans compter de consultation ; seul l'instantané de CE lien personnel est lu.
 */
export async function GET(_req: Request, ctx: RouteContext<"/espace/[token]/pdf/[n]">) {
  const { token, n } = await ctx.params;
  const res = await callStudentView(token, false);
  const results =
    res.status === "ok"
      ? [...res.results].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      : [];
  const wanted = results[Number(n) - 1];
  if (!wanted) return new Response("Introuvable", { status: 404 });
  const buffer = await renderToBuffer(ResultsDocument({ sheets: [wanted.sheet] }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="mes-resultats.pdf"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
