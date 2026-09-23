import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { AdminDocsChecklist } from "@/components/modules/admin-docs-checklist";
import { CourseList } from "@/components/modules/course-list";
import { ModuleDangerZone } from "@/components/modules/module-danger-zone";
import { OutlineActions } from "@/components/modules/outline-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { moduleNoteProgress } from "@/lib/assessments/queries";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { getOutline } from "@/lib/outline/queries";
import { listModuleGroups } from "@/lib/students/queries";
import { ICEBERG_LABELS } from "@/lib/ynov/iceberg";
import { trameStatus, type TrameAlertLevel } from "@/lib/ynov/trame";

export async function generateMetadata({ params }: PageProps<"/modules/[id]">): Promise<Metadata> {
  const { id } = await params;
  const mod = await getModule(id);
  return { title: mod?.name ?? "Module" };
}

const TRAME_MESSAGE: Record<TrameAlertLevel, (days: number | null) => string> = {
  sent: () => "Trame envoyée.",
  overdue: (d) => `Échéance dépassée depuis ${Math.abs(d ?? 0)} jour(s) — à envoyer sans attendre.`,
  urgent: (d) => `Échéance dans ${d} jour(s) (J-15/J-7) — à envoyer rapidement.`,
  warning: (d) => `Échéance dans ${d} jour(s) — pensez à la préparer.`,
  ok: (d) => `Échéance dans ${d} jour(s).`,
  unknown: () => "Renseignez la date de la 1re séance pour calculer l’échéance.",
};

const TRAME_VARIANT: Record<TrameAlertLevel, "default" | "destructive" | "outline" | "secondary"> =
  {
    sent: "secondary",
    overdue: "destructive",
    urgent: "destructive",
    warning: "outline",
    ok: "outline",
    unknown: "outline",
  };

export default async function ModulePage({ params }: PageProps<"/modules/[id]">) {
  const { id } = await params;
  const [mod, courses, groups] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    listModuleGroups(id),
  ]);
  if (!mod) notFound();

  const [notes, outline] = await Promise.all([
    moduleNoteProgress(id, mod.total_hours),
    getOutline(id),
  ]);
  const trame = trameStatus(mod.first_session_date, mod.iceberg_state);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{mod.name}</h1>
          <p className="text-muted-foreground">
            {mod.school?.name ?? "École non renseignée"} · {mod.level ?? "—"} · {mod.year}
            {mod.ycode ? ` · YCODE ${mod.ycode}` : ""}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/modules/${mod.id}/edit`}>
            <Pencil aria-hidden />
            Modifier
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{mod.total_hours} h</Badge>
        <Badge variant={notes.satisfied ? "secondary" : "outline"}>
          {notes.enteredTotal}/{notes.requirement.total} note
          {notes.requirement.total > 1 ? "s" : ""} ({notes.requirement.group} groupe
          {notes.requirement.group > 1 ? "s" : ""} + {notes.requirement.individual} individuelle
          {notes.requirement.individual > 1 ? "s" : ""})
          {!notes.requirement.exact ? " — hors palier, à confirmer" : ""}
        </Badge>
        <Badge variant="outline">{ICEBERG_LABELS[mod.iceberg_state]}</Badge>
      </div>

      <section aria-labelledby="trame" className="rounded-lg border p-4">
        <h2 id="trame" className="mb-1 text-lg font-medium">
          Trame pédagogique
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={TRAME_VARIANT[trame.level]}>
            {TRAME_MESSAGE[trame.level](trame.daysUntilDue)}
          </Badge>
          {trame.dueDate ? (
            <span className="text-muted-foreground text-sm">
              Échéance : {trame.dueDate.toLocaleDateString("fr-FR")}
            </span>
          ) : null}
        </div>
        {outline ? (
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
          <OutlineActions moduleId={mod.id} status={outline?.status ?? null} />
        </div>
      </section>

      <section aria-labelledby="courses">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="courses" className="text-lg font-medium">
            Séances ({courses.length})
          </h2>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/modules/${mod.id}/courses/new`}>
              <Plus aria-hidden />
              Ajouter une séance
            </Link>
          </Button>
        </div>
        <CourseList moduleId={mod.id} courses={courses} />
      </section>

      <section aria-labelledby="groups">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="groups" className="text-lg font-medium">
            Groupes ({groups.length})
          </h2>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/modules/${mod.id}/groups/new`}>
              <Plus aria-hidden />
              Ajouter un groupe
            </Link>
          </Button>
        </div>
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun groupe pour l’instant.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/modules/${mod.id}/groups/${g.id}`}
                  className="hover:bg-accent focus-visible:ring-ring block rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <p className="font-medium">{g.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {g.members.length} membre{g.members.length > 1 ? "s" : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="assessments" className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="assessments" className="text-lg font-medium">
              Évaluations
            </h2>
            <p className="text-muted-foreground text-sm">
              {notes.enteredTotal}/{notes.requirement.total} note
              {notes.requirement.total > 1 ? "s" : ""} saisie
              {notes.enteredTotal > 1 ? "s" : ""}.
            </p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/modules/${mod.id}/assessments`}>Voir les évaluations</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="billing" className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="billing" className="text-lg font-medium">
              Facturation
            </h2>
            <p className="text-muted-foreground text-sm">
              Conditions YNOV, mentions obligatoires et facture Factur-X.
            </p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/modules/${mod.id}/billing`}>Voir la facturation</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="admin-docs">
        <h2 id="admin-docs" className="mb-3 text-lg font-medium">
          Documents administratifs
        </h2>
        <AdminDocsChecklist
          moduleId={mod.id}
          adminDocs={(mod.admin_docs as Record<string, boolean>) ?? {}}
        />
      </section>

      <section aria-labelledby="danger">
        <h2 id="danger" className="mb-3 text-lg font-medium">
          Actions
        </h2>
        <ModuleDangerZone id={mod.id} year={mod.year} />
      </section>
    </div>
  );
}
