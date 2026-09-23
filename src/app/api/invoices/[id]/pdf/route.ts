import { buildFacturX } from "@/lib/invoice/facturx";
import { getInvoice } from "@/lib/invoice/queries";
import type { InvoiceSnapshot } from "@/lib/ynov/invoice";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/invoices/[id]/pdf">) {
  const { id } = await ctx.params;
  const invoice = await getInvoice(id);
  if (!invoice?.snapshot) return new Response("Facture introuvable", { status: 404 });

  const snapshot = invoice.snapshot as unknown as InvoiceSnapshot;
  const { pdf } = await buildFacturX(snapshot);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${snapshot.number}.pdf"`,
    },
  });
}
