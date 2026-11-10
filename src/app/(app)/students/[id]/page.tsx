import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { StudentPhotoManager } from "@/components/students/student-photo-manager";
import { StudentSpaceCard } from "@/components/students/student-space-card";
import { moduleStudentAverages } from "@/lib/assessments/queries";
import { loadMakeupGroups } from "@/lib/assessments/makeup-queries";
import { getStudentSpaces } from "@/lib/modules/frise-queries";
import { StudentActions } from "@/components/students/student-actions";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { StudentJournal } from "@/components/students/student-journal";
import { listStudentObservations } from "@/lib/notebook/queries";
import {
  listStudentAppreciations,
  listStudentGradeLines,
  listStudentSubmissions,
} from "@/lib/students/record-queries";
import { absences, ATTENDANCE_LABELS, formatGrade, gradesByModule } from "@/lib/students/record";
import { groupsBySchoolYear } from "@/lib/students/groups";
import { getStudent, getStudentGroups, getStudentYears } from "@/lib/students/queries";
import { promotions } from "@/lib/students/years";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/students/[id]">): Promise<Metadata> {
  const { id } = await params;
  const student = await getStudent(id);
  return { title: student ? `${student.first_name} ${student.last_name}` : "Étudiant·e" };
}

export default async function StudentPage({ params }: PageProps<"/students/[id]">) {
  const { id } = await params;
  const [student, groups, observations, years, gradeLines, appreciations, submissions] =
    await Promise.all([
      getStudent(id),
      getStudentGroups(id),
      listStudentObservations(id),
      getStudentYears(id),
      listStudentGradeLines(id),
      listStudentAppreciations(id),
      listStudentSubmissions(id),
    ]);
  const gradeModules = gradesByModule(gradeLines);
  // Mêmes notes et même moyenne que l'écran d'appréciation : une seule source (moyenne du module).
  const moduleAverages = new Map(
    await Promise.all(
      gradeModules.map(
        async (m) =>
          [
            m.moduleId,
            (await moduleStudentAverages(m.moduleId)).find((a) => a.student.id === id) ?? null,
          ] as const,
      ),
    ),
  );
  // Absence excusée pas encore rattrapée, par module : « rattrapage en attente ».
  const makeupPendingModules = new Set(
    (
      await Promise.all(
        gradeModules.map(async (m) =>
          (await loadMakeupGroups(m.moduleId))
            .flatMap((g) => g.rows)
            .some((r) => r.student.id === id && r.step !== "done")
            ? [m.moduleId]
            : [],
        ),
      )
    ).flat(),
  );
  const missed = absences(gradeLines);
  const promos = promotions(years);
  if (!student) notFound();
  const spaceModules = [
    ...new Map(
      groups.flatMap((g) =>
        g.module ? [[g.module.id, { id: g.module.id, name: g.module.name }]] : [],
      ),
    ).values(),
  ];
  const supabase = await createClient();
  const [spaces, { data: planned }] = await Promise.all([
    getStudentSpaces(student, spaceModules),
    spaceModules.length
      ? supabase
          .from("assessment")
          .select("module_id")
          .in(
            "module_id",
            spaceModules.map((m) => m.id),
          )
          .is("makeup_of_id", null)
          .eq("is_bonus", false)
      : Promise.resolve({ data: [] as { module_id: string }[] }),
  ]);
  const plannedBy = new Map<string, number>();
  for (const a of planned ?? []) plannedBy.set(a.module_id, (plannedBy.get(a.module_id) ?? 0) + 1);
  // Tous les modules de la personne, avec ou sans note.
  const allModules = [
    ...spaceModules.map((m) => ({ moduleId: m.id, moduleName: m.name })),
    ...gradeModules
      .filter((g) => !spaceModules.some((m) => m.id === g.moduleId))
      .map((g) => ({ moduleId: g.moduleId, moduleName: g.moduleName })),
  ];
  const excusedCount = missed.filter((l) => l.attendance === "absent_excused").length;
  const lastObservation = observations[0]?.created_at ?? null;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Paris",
    });

  const card = "bg-card rounded-xl border p-5";
  const initials = `${student.first_name.charAt(0)}${student.last_name.charAt(0)}`.toUpperCase();
  const summaryLink = "underline underline-offset-2 hover:no-underline";

  return (
    <div className="max-w-5xl space-y-4">
      <section aria-labelledby="identity" className={card}>
        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden
            className="bg-primary/20 text-primary flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-bold"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h1 id="identity" className="font-heading text-3xl font-bold tracking-tight">
              {student.first_name} {student.last_name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {[
                promos[0] ? `${promos[0].group} · promotion ${promos[0].label}` : null,
                student.email ?? "Pas d’e-mail",
                student.student_number ? `n° ${student.student_number}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button asChild variant="ghost" size="touch">
            <Link href={`/students/${student.id}/edit`}>
              <Pencil aria-hidden />
              Modifier la fiche
            </Link>
          </Button>
        </div>

        <h2 className="sr-only">Résumé</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {allModules.map((m) => {
            const avg = moduleAverages.get(m.moduleId)?.average.average ?? null;
            const a = appreciations.items?.find((x) => x.moduleId === m.moduleId);
            return (
              <li key={m.moduleId} className="bg-muted/40 rounded-lg p-2">
                <a href={`#grades-${m.moduleId}`} className={`font-semibold ${summaryLink}`}>
                  {m.moduleName}
                </a>
                <span className="block">
                  Moyenne : <strong>{avg != null ? formatGrade(avg, 20) : "pas encore"}</strong>
                  {makeupPendingModules.has(m.moduleId) ? " · rattrapage en attente" : ""}
                </span>
                {appreciations.available ? (
                  <a href="#appreciations" className={summaryLink}>
                    Appréciation {a ? "écrite" : "à écrire"}
                  </a>
                ) : null}
              </li>
            );
          })}
          <li className="bg-muted/40 rounded-lg p-2">
            <a href="#attendance" className={`font-semibold ${summaryLink}`}>
              {missed.length === 0
                ? "Aucune absence"
                : `${missed.length} absence${missed.length > 1 ? "s" : ""}`}
            </a>
            {missed.length > 0 ? (
              <span className="block">
                {excusedCount} excusée{excusedCount > 1 ? "s" : ""} · {missed.length - excusedCount}{" "}
                non prévenue{missed.length - excusedCount > 1 ? "s" : ""}
              </span>
            ) : null}
          </li>
          <li className="bg-muted/40 rounded-lg p-2">
            <a href="#observations" className={`font-semibold ${summaryLink}`}>
              {observations.length} observation{observations.length > 1 ? "s" : ""}
            </a>
            {lastObservation ? (
              <span className="block">dernière le {fmtDate(lastObservation)}</span>
            ) : null}
          </li>
          <li className="bg-muted/40 rounded-lg p-2">
            <a href="#submissions" className={`font-semibold ${summaryLink}`}>
              {submissions.length} rendu{submissions.length > 1 ? "s" : ""} déposé
              {submissions.length > 1 ? "s" : ""}
            </a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="grades" className={card}>
        <h2 id="grades" className="font-heading mb-2 text-xl font-bold">
          Notes par module
        </h2>
        {allModules.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune note pour l’instant.</p>
        ) : (
          <div className="space-y-3">
            {allModules.map((m) => {
              const lines = moduleAverages.get(m.moduleId)?.lines ?? [];
              return (
                <section
                  key={m.moduleId}
                  id={`grades-${m.moduleId}`}
                  aria-labelledby={`grades-${m.moduleId}-title`}
                >
                  <h3 id={`grades-${m.moduleId}-title`} className="mb-1 text-sm font-semibold">
                    <Link href={`/modules/${m.moduleId}`} className="underline underline-offset-2">
                      {m.moduleName}
                    </Link>
                  </h3>
                  {lines.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Aucune note pour l’instant · 0 / {plannedBy.get(m.moduleId) ?? 0} note
                      {(plannedBy.get(m.moduleId) ?? 0) > 1 ? "s" : ""} prévue
                      {(plannedBy.get(m.moduleId) ?? 0) > 1 ? "s" : ""}
                    </p>
                  ) : (
                    <ul className="divide-y text-sm">
                      {lines.map((l) => (
                        <li
                          key={`${l.assessmentId}-${l.kind}`}
                          className="flex flex-wrap justify-between gap-2 py-2"
                        >
                          <span>
                            <Link
                              href={`/modules/${m.moduleId}/assessments/${l.assessmentId}`}
                              className="underline underline-offset-2"
                            >
                              {l.title}
                            </Link>
                            {l.kind === "group" ? " · note de groupe" : " · individuelle"}
                            {l.isBonus ? " · bonus" : ` · coef. ${l.coefficient}`}
                          </span>
                          <strong>{formatGrade(l.value, l.max)}</strong>
                        </li>
                      ))}
                      {moduleAverages.get(m.moduleId)?.average.average != null ? (
                        <li className="flex justify-between gap-2 py-2 font-semibold">
                          <span>Moyenne du module</span>
                          <span className="text-right">
                            {formatGrade(moduleAverages.get(m.moduleId)!.average.average, 20)}
                            {makeupPendingModules.has(m.moduleId) ? (
                              <span className="text-sun block text-xs">rattrapage en attente</span>
                            ) : null}
                          </span>
                        </li>
                      ) : null}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="appreciations" className={card}>
        <h2 id="appreciations" className="font-heading mb-1 text-lg font-bold">
          Appréciations
        </h2>
        {!appreciations.available ? (
          <p className="text-muted-foreground text-sm">
            Les appréciations seront disponibles après la mise à jour de la base de données.
          </p>
        ) : spaceModules.length === 0 ? (
          <p className="text-muted-foreground text-sm">Cette personne n’est dans aucun module.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {spaceModules.map((m) => {
              const a = appreciations.items.find((x) => x.moduleId === m.id);
              return (
                <li key={m.id} className="bg-muted/40 rounded-lg p-3">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{m.name}</strong>
                    <Link
                      href={`/modules/${m.id}/appreciations/${student.id}`}
                      className="font-semibold underline underline-offset-2"
                    >
                      {a ? "Modifier l’appréciation" : "Écrire l’appréciation"}
                      <span className="sr-only"> pour {m.name}</span>
                    </Link>
                  </p>
                  {a ? (
                    <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{a.text}</p>
                  ) : (
                    <p className="text-muted-foreground mt-1">Aucune appréciation écrite.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="attendance" className={card}>
        <h2 id="attendance" className="font-heading mb-2 text-lg font-bold">
          Présences
        </h2>
        {missed.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune absence notée.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {missed.map((l) => (
              <li key={`${l.assessmentId}-${l.isGroupGrade}`}>
                {l.moduleName} · {l.assessmentTitle} : {ATTENDANCE_LABELS[l.attendance]}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="submissions" className={card}>
        <h2 id="submissions" className="font-heading mb-2 text-lg font-bold">
          Rendus
        </h2>
        {submissions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun rendu déposé.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {submissions.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/modules/${r.moduleId}/assessments/${r.assessmentId}`}
                  className="underline underline-offset-2"
                >
                  {r.assessmentTitle}
                </Link>
                {r.label.trim() ? ` : ${r.label}` : " : fichier déposé"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="observations" className={card}>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 id="observations" className="font-heading text-xl font-bold">
            Observations
          </h2>
          <Pill tone="warn">Pour toi seule</Pill>
        </div>
        {observations.length === 0 ? (
          <EmptyState
            compact
            title="Rien noté sur cette personne"
            description="Tu pourras ajouter une observation pendant le cours, en un appui."
          />
        ) : (
          <StudentJournal studentId={id} observations={observations} />
        )}
        <p className="text-muted-foreground mt-2 text-xs">
          Ce carnet ne sort jamais de l’appli : ni en PDF, ni à l’écran projeté.
        </p>
      </section>

      <section aria-labelledby="groups" className={card}>
        <h2 id="groups" className="font-heading mb-2 text-lg font-bold">
          Groupes et promotions
        </h2>
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">N’appartient à aucun groupe.</p>
        ) : (
          <div className="space-y-3">
            {groupsBySchoolYear(groups).map((y) => (
              <section key={y.label} aria-labelledby={`groups-${y.label}`}>
                <h3
                  id={`groups-${y.label}`}
                  className="text-muted-foreground mb-1 text-sm font-medium"
                >
                  {y.year === null
                    ? y.label
                    : `Année ${y.label}${promos.find((p) => p.year === y.year) ? ` · ${promos.find((p) => p.year === y.year)!.group}` : ""}`}
                </h3>
                <ul className="space-y-1 text-sm">
                  {y.groups.map((g) => (
                    <li key={g.id}>
                      <Link
                        href={`/modules/${g.module_id}/groups/${g.id}`}
                        className="font-semibold underline underline-offset-2"
                      >
                        {g.display}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <h3 className="text-muted-foreground mt-3 mb-1 text-sm font-medium">Promotions</h3>
        {promos.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune promotion enregistrée.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {promos.map((p) => (
              <li key={p.year}>
                <span className="text-muted-foreground">{p.label}</span> : {p.group}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="space" className={card}>
        <h2 id="space" className="font-heading mb-2 text-lg font-bold">
          Espace étudiant·e
        </h2>
        <StudentSpaceCard spaces={spaces} />
      </section>

      <div className={card}>
        <StudentPhotoManager student={student} />
      </div>

      {student.personal_notes ? (
        <section aria-labelledby="notes" className={card}>
          <h2 id="notes" className="font-heading mb-2 text-lg font-bold">
            Notes personnelles
          </h2>
          <p className="text-sm whitespace-pre-wrap">{student.personal_notes}</p>
        </section>
      ) : null}

      <section aria-labelledby="danger" className={card}>
        <h2 id="danger" className="font-heading mb-2 text-lg font-bold">
          Actions
        </h2>
        <StudentActions id={student.id} name={`${student.first_name} ${student.last_name}`} />
      </section>
      <Button asChild variant="ghost" size="touch">
        <Link href="/students">← Étudiant·es</Link>
      </Button>
    </div>
  );
}
