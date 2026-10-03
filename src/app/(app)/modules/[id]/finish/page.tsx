import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinishModuleForm } from "@/components/modules/finish-module-form";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { isPaid, isSent } from "@/lib/invoice/simple";
import { loadInvoiceContext } from "@/lib/invoice/queries";
import { agreementDeposited } from "@/lib/modules/documents";
import { finishChecklist } from "@/lib/modules/finish";
import { getModule, getModuleCourses, getModuleDocuments } from "@/lib/modules/queries";
import { getRetrospectiveNote, retrospectiveAvailable } from "@/lib/modules/retrospective-queries";

export const metadata: Metadata = { title: "Terminer le module" };

/** Terminer le module (maquette « ModFin ») : ce qu'il reste, ce que je retiens, ranger. Rien n'est bloquant. */
export default async function FinishModulePage({ params }: PageProps<"/modules/[id]/finish">) {
  const { id } = await params;
  const [mod, courses, ctx, askNote, note, documents] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    loadInvoiceContext(id),
    retrospectiveAvailable(),
    getRetrospectiveNote(id),
    getModuleDocuments(id),
  ]);
  if (!mod || !ctx) notFound();

  const items = finishChecklist({
    courses: courses.map((c) => ({ completion: c.completion })),
    notes: { entered: ctx.notes.enteredTotal, required: ctx.notes.requiredTotal },
    adminDocs: ctx.module.admin_docs,
    invoiceSent: isSent(mod.iceberg_state),
    invoicePaid: isPaid(mod.iceberg_state),
    agreementDeposited: agreementDeposited(documents),
  });
  const card = "bg-card rounded-xl border p-5";

  return (
    <div className="flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-start">
      <section aria-labelledby="tm" className={`${card} min-w-0 flex-[3_1_0] space-y-3`}>
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Où j’en suis</p>
        <h1 id="tm" className="font-heading text-3xl font-bold tracking-tight">
          Terminer le module
        </h1>
        <p className="text-muted-foreground">
          Tout ce qu’il reste avant de le ranger. Rien n’est bloquant : tu peux revenir.
        </p>
        <ul className="divide-y">
          {items.map((i) => (
            <li key={i.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Pill tone={i.done ? "ok" : "warn"}>{i.done ? "✓" : "!"}</Pill>
                <div>
                  <strong>{i.label}</strong>
                  <div className="text-muted-foreground text-sm">{i.detail}</div>
                </div>
              </div>
              <Pill tone={i.done ? "ok" : "warn"}>{i.done ? "Fait" : "À faire"}</Pill>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <h2 className="font-heading text-xl font-bold">Ton retour, pour toi seule</h2>
          <Pill tone="lock">Privé</Pill>
        </div>
        <FinishModuleForm id={mod.id} name={mod.name} askNote={askNote} initialNote={note ?? ""} />
      </section>

      <div className="min-w-0 flex-[2_1_0] space-y-4 lg:max-w-md">
        <section
          aria-labelledby="cl"
          className="bg-primary/10 border-primary/50 space-y-2 rounded-xl border p-5"
        >
          <h2 id="cl" className="font-heading text-xl font-bold">
            Ranger le module
          </h2>
          <p className="text-muted-foreground text-sm">
            Le module sort de la liste « en cours ». Tu le retrouves dans « Terminés », et tu peux
            le rouvrir.
          </p>
        </section>
        <section aria-labelledby="ar" className={`${card} space-y-1`}>
          <h2 id="ar" className="font-heading text-lg font-bold">
            Ce qui reste accessible
          </h2>
          <p className="text-muted-foreground text-sm">
            Notes, résultats publiés, observations et facture restent consultables. Les étudiant·es
            gardent leur lien personnel.
          </p>
        </section>
        <Button asChild variant="ghost" size="touch">
          <Link href={`/modules/${mod.id}`}>← Retour au module</Link>
        </Button>
      </div>
    </div>
  );
}
