import { snapshotToXml } from "@/lib/invoice/facturx";
import { getInvoice } from "@/lib/invoice/queries";
import type { InvoiceSnapshot } from "@/lib/ynov/invoice";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/invoices/[id]/xml">) {
  const { id } = await ctx.params;
  const invoice = await getInvoice(id);
  if (!invoice?.snapshot) return new Response("Facture introuvable", { status: 404 });

  const snapshot = invoice.snapshot as unknown as InvoiceSnapshot;
  return new Response(snapshotToXml(snapshot), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="facture-${snapshot.number}.xml"`,
    },
  });
}
