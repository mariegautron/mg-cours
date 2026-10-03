import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";

import { ExpectationsSummary } from "@/components/modules/expectations-summary";
import { OutlineActions } from "@/components/modules/outline-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getModule, getModuleDocuments, getModuleExpectations } from "@/lib/modules/queries";
import { getOutline } from "@/lib/outline/queries";
import { trameMessage, trameStatus, type TrameAlertLevel } from "@/lib/ynov/trame";

export const metadata: Metadata = { title: "Progression pédagogique" };

const TRAME_VARIANT: Record<TrameAlertLevel, "default" | "destructive" | "outline" | "secondary"> =
  {
    sent: "secondary",
    overdue: "destructive",
    urgent: "destructive",
    warning: "outline",
    ok: "outline",
    unknown: "outline",
  };

export default async function ModuleOutlinePage({ params }: PageProps<"/modules/[id]/outline">) {
  const { id } = await params;
  const [mod, documents, expectations, outline] = await Promise.all([
    getModule(id),
    getModuleDocuments(id),
    getModuleExpectations(id),
    getOutline(id),
  ]);
  if (!mod) notFound();
  const trame = trameStatus(mod.first_session_date, mod.iceberg_state);
  const depositedOutline = documents.find((d) => d.kind === "outline_sent") ?? null;

  return (
    <div className="max-w-4xl space-y-6">
      <ExpectationsSummary moduleId={mod.id} expectations={expectations} />
      <section aria-labelledby="trame">
        <h1 id="trame" className="font-heading mb-1 text-2xl font-bold">
          Progression pédagogique
        </h1>
        {depositedOutline ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Progression envoyée (PDF déposé le{" "}
              {new Date(depositedOutline.created_at).toLocaleDateString("fr-FR")})
            </Badge>
            <Button asChild size="sm" variant="secondary">
              <a href={`/api/modules/${mod.id}/documents/${depositedOutline.id}`}>
                <Download aria-hidden />
                Télécharger
              </a>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a
                href={`/api/modules/${mod.id}/documents/${depositedOutline.id}?inline=1`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden />
                Voir
                <span className="sr-only"> — s’ouvre dans un nouvel onglet</span>
              </a>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={TRAME_VARIANT[trame.level]}>
              {trameMessage(trame.level, trame.daysUntilDue)}
            </Badge>
            {trame.dueDate ? (
              <span className="text-muted-foreground text-sm">
                Échéance : {trame.dueDate.toLocaleDateString("fr-FR")}
              </span>
            ) : null}
          </div>
        )}
        {outline && depositedOutline ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Progression générée depuis les séances le{" "}
            {new Date(outline.generated_at).toLocaleDateString("fr-FR")} (brouillon, non envoyée).
          </p>
        ) : outline ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Générée le {new Date(outline.generated_at).toLocaleDateString("fr-FR")}
            {outline.sent_at
              ? ` · envoyée le ${new Date(outline.sent_at).toLocaleDateString("fr-FR")}`
              : ""}
            {outline.validated_at
              ? ` · validée le ${new Date(outline.validated_at).toLocaleDateString("fr-FR")}`
              : ""}
            .
          </p>
        ) : null}
        <div className="mt-3">
          <OutlineActions
            moduleId={mod.id}
            status={outline?.status ?? null}
            hasDepositedOutline={!!depositedOutline}
            archived={!!mod.archived_at}
          />
        </div>
      </section>
    </div>
  );
}
