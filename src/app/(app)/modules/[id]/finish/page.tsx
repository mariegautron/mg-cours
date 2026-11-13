import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDocsChecklist } from "@/components/modules/admin-docs-checklist";
import { FinishModuleForm } from "@/components/modules/finish-module-form";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { isPaid, isSent } from "@/lib/invoice/simple";
import { loadInvoiceContext } from "@/lib/invoice/queries";
import { agreementDeposited } from "@/lib/modules/documents";
import { finishChecklist } from "@/lib/modules/finish";
import { getModule, getModuleCourses, getModuleDocuments } from "@/lib/modules/queries";
import { getAppreciationProgress } from "@/lib/appreciations/queries";
import { createClient } from "@/lib/supabase/server";
import { loadMakeupGroups } from "@/lib/assessments/makeup-queries";
import { getRetrospectiveNote, retrospectiveAvailable } from "@/lib/modules/retrospective-queries";

export const metadata: Metadata = { title: "Terminer le module" };

/**
 * Terminer le module (maquette « ModFin ») : ce qu'il reste (appréciations et documents
 * administratifs compris), ton retour, terminer (= archiver). Seul endroit pour ces gestes (D16-D19).
 * Rien n'est bloquant.
 */
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
  const supabase = await createClient();
  const [appreciations, feedbackLink, feedbackCount, makeupGroups] = await Promise.all([
    getAppreciationProgress(id),
    supabase
      .from("module_feedback_link")
      .select("token")
      .eq("module_id", id)
      .is("revoked_at", null)
      .maybeSingle(),
    supabase
      .from("module_feedback")
      .select("id", { count: "exact", head: true })
      .eq("module_id", id),
    loadMakeupGroups(id),
  ]);
  const makeupRows = makeupGroups.flatMap((g) => g.rows);

  const items = finishChecklist({
    courses: courses.map((c) => ({ completion: c.completion })),
    notes: { entered: ctx.notes.enteredTotal, required: ctx.notes.requiredTotal },
    adminDocs: ctx.module.admin_docs,
    invoiceSent: isSent(mod.iceberg_state),
    invoicePaid: isPaid(mod.iceberg_state),
    agreementDeposited: agreementDeposited(documents),
    appreciations: { written: appreciations.written, total: appreciations.total },
    makeups: {
      pending: makeupRows.filter((r) => r.step !== "done").length,
      total: makeupRows.length,
    },
    feedbackResponses: feedbackLink.data ? (feedbackCount.count ?? 0) : null,
    hrefs: {
      sessions: `/modules/${id}/courses`,
      notes: `/modules/${id}/finish#admin-docs`,
      appreciations: `/modules/${id}/appreciations`,
      makeups: `/modules/${id}/rattrapages`,
      documents: `/modules/${id}/finish#admin-docs`,
      invoice: `/modules/${id}/billing`,
      agreement: `/modules/${id}/documents#convention`,
      feedback: `/modules/${id}/feedback`,
    },
  });
  const card = "bg-card rounded-xl border p-5";

  return (
    <div className="flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-start">
      <section aria-labelledby="tm" className={`${card} min-w-0 flex-[3_1_0] space-y-3`}>
        <p className="text-muted-foreground text-[0.8125rem] font-medium">Où j’en suis</p>
        <h1 id="tm">Terminer le module</h1>
        <p className="text-muted-foreground">
          Tout ce qu’il reste avant de le terminer. Rien n’est bloquant : tu peux revenir.
        </p>
        <ul className="divide-y">
          {items.map((i) => (
            <li key={i.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Pill tone={i.done ? "ok" : i.optional ? "plain" : "warn"}>
                  {i.done ? "✓" : i.optional ? "·" : "!"}
                </Pill>
                <div>
                  {i.href ? (
                    <Link href={i.href} className="font-bold underline-offset-2 hover:underline">
                      {i.label}
                    </Link>
                  ) : (
                    <strong>{i.label}</strong>
                  )}
                  <div className="text-muted-foreground text-sm">{i.detail}</div>
                </div>
              </div>
              <Pill tone={i.done ? "ok" : i.optional ? "plain" : "warn"}>
                {i.done ? "Fait" : i.optional ? "Facultatif" : "À faire"}
              </Pill>
            </li>
          ))}
        </ul>
        <section aria-labelledby="admin-docs" className="space-y-2 border-t pt-3">
          <h2 id="admin-docs" className="text-sm font-semibold">
            Documents administratifs
          </h2>
          <AdminDocsChecklist
            moduleId={mod.id}
            adminDocs={(mod.admin_docs as Record<string, boolean>) ?? {}}
          />
        </section>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <h2 className="text-sm font-semibold">Ton retour, pour toi seule</h2>
          <Pill tone="plain">Privé</Pill>
        </div>
        {mod.finished_at && !askNote ? null : (
          <FinishModuleForm
            id={mod.id}
            name={mod.name}
            askNote={askNote}
            initialNote={note ?? ""}
            finished={!!mod.finished_at}
          />
        )}
      </section>

      <div className="min-w-0 flex-[2_1_0] space-y-4 lg:max-w-md">
        <section
          aria-labelledby="cl"
          className="bg-primary/10 border-primary/50 space-y-2 rounded-xl border p-5"
        >
          <h2 id="cl" className="text-sm font-semibold">
            Terminer
          </h2>
          <p className="text-muted-foreground text-sm">
            {mod.finished_at
              ? "Ce module est terminé et archivé. Tu peux encore écrire ton retour ; pour le rouvrir, passe par la liste des modules (« Terminés »)."
              : "Le module est archivé : il sort de « En cours » et du tableau de bord. Tu le retrouves dans « Terminés », et tu peux le rouvrir."}
          </p>
        </section>
        <section aria-labelledby="fb" className={`${card} space-y-2`}>
          <h2 id="fb" className="text-sm font-semibold">
            Retour des étudiant·es
          </h2>
          <p className="text-muted-foreground text-sm">
            Un questionnaire anonyme à leur envoyer, pour savoir quoi améliorer la prochaine fois.
          </p>
          <Button asChild variant="outline" size="touch">
            <Link href={`/modules/${mod.id}/feedback`}>Ouvrir le questionnaire</Link>
          </Button>
        </section>
        <section aria-labelledby="ar" className={`${card} space-y-1`}>
          <h2 id="ar" className="text-sm font-semibold">
            Ce qui reste accessible
          </h2>
          <p className="text-muted-foreground text-sm">
            Notes, résultats publiés, observations et facture restent consultables. Les étudiant·es
            gardent leur lien personnel.
          </p>
        </section>
      </div>
    </div>
  );
}
