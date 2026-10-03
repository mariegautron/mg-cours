import { renderToBuffer } from "@react-pdf/renderer";

import { ResultsDocument } from "@/lib/pdf/results";
import { callResult } from "@/lib/result-links/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF des résultats d'UNE personne, par son lien personnel (le même PDF que celui envoyé par e-mail). */
export async function GET(_req: Request, ctx: RouteContext<"/resultats/[token]/pdf">) {
  const { token } = await ctx.params;
  // Le téléchargement n'est pas une « vue » de la page : il ne compte pas dans le suivi.
  const result = await callResult(token, false);
  if (result.status !== "ok") {
    return new Response("Lien invalide ou expiré", {
      status: result.status === "throttled" ? 429 : 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const buffer = await renderToBuffer(ResultsDocument({ sheets: [result.sheet] }));
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
