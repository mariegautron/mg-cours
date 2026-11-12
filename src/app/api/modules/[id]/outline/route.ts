import { renderToBuffer } from "@react-pdf/renderer";

import { getOutline } from "@/lib/outline/queries";
import { OutlineDocument } from "@/lib/pdf/outline";
import { createClient } from "@/lib/supabase/server";
import type { OutlineContent } from "@/lib/ynov/outline";

export const runtime = "nodejs";

/** « 2026-11-09-10h12 » à l'heure de Paris. */
function stamp(iso: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}-${get("hour")}h${get("minute")}`;
}

/**
 * PDF de la progression. `?version=envoyee` : la version figée au clic sur « J'ai envoyé »
 * (ce que l'école a reçu) ; sinon la version générée en dernier.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/modules/[id]/outline">) {
  const { id } = await ctx.params;
  const outline = await getOutline(id);
  if (!outline) return new Response("Progression pédagogique introuvable", { status: 404 });

  const content = outline.content as unknown as OutlineContent;
  const slug = content.moduleName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const ycode = content.ycode ? `${content.ycode.replace(/[^a-zA-Z0-9_-]+/g, "")}-` : "";

  const params = new URL(req.url).searchParams;
  const sent = params.get("version") === "envoyee";
  // Aperçu intégré dans la page Progression : le PDF s'affiche au lieu de se télécharger.
  const disposition = params.get("inline") === "1" ? "inline" : "attachment";
  if (sent) {
    if (!outline.pdf_path || !outline.sent_at)
      return new Response("Aucune version envoyée gardée", { status: 404 });
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from("module-documents")
      .download(outline.pdf_path);
    if (error || !data) return new Response("Version envoyée introuvable", { status: 404 });
    return new Response(new Uint8Array(await data.arrayBuffer()), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="progression-${ycode}${slug}-envoyee-${stamp(outline.sent_at)}.pdf"`,
      },
    });
  }

  const buffer = await renderToBuffer(OutlineDocument({ content }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="progression-${ycode}${slug}-${stamp(outline.generated_at)}.pdf"`,
    },
  });
}
