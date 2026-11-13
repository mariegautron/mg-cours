import { isSessionReady } from "@/lib/prep-status";
import Link from "next/link";

import { Pill } from "@/components/dashboard/pill";
import { DisclosureMenu } from "@/components/ui/disclosure-menu";
import { Notice } from "@/components/ui/notice";
import type { CourseWithResources } from "@/lib/modules/queries";
import { sessionToTeach, todayInParis } from "@/lib/modules/next-session";
import {
  hoursLabel,
  listDateLine,
  minutesBetween,
  STATUS_TONES,
  statusLabel,
} from "@/lib/modules/workspace";
import { cn } from "@/lib/utils";

/** Colonne étroite de la maquette « Séances » : toutes les séances du module, la courante surlignée. */
export function SessionList({
  moduleId,
  courses,
  currentId,
  totalHours,
  missing,
  hoursMessage = null,
  layout = "column",
}: {
  moduleId: string;
  courses: CourseWithResources[];
  currentId: string | null;
  totalHours: number;
  /** Attendus qu'aucune séance ne couvre. */
  missing: string[];
  /** Écart entre les heures planifiées et celles du module. */
  hoursMessage?: string | null;
  /**
   * « column » : colonne à gauche (grand écran) ; « drawer » : liste repliée en haut de la page, pour
   * laisser au moins 560 px à la colonne de travail (portable à 125 %).
   */
  layout?: "column" | "drawer";
}) {
  const minutes = courses.reduce((n, c) => n + (minutesBetween(c.start_time, c.end_time) ?? 0), 0);
  // Une séance « Prête » dont le déroulé garde une ressource « À construire » ne compte pas comme
  // prête : la ressource ne pourra pas être projetée.
  const toBuild = (c: CourseWithResources) =>
    c.resources.filter((r) => r.status !== "ready").length;
  const ready = courses.filter((c) => isSessionReady(c) && toBuild(c) === 0).length;
  // Repère de la séance à faire (du jour ou prochaine), pour la retrouver en consultant une autre.
  const today = todayInParis();
  const focus = sessionToTeach(courses, today);
  // « Prochaine » : la première séance datée aujourd'hui ou plus tard (sinon la séance à faire).
  const upcomingId =
    courses
      .filter((c) => !c.completion && c.session_date && c.session_date >= today)
      .sort((a, b) => a.session_date!.localeCompare(b.session_date!))[0]?.id ??
    (focus && (!focus.session_date || focus.session_date >= today) ? focus.id : null);
  const BTN =
    "focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none";
  const heading = courses.length > 1 ? `Les ${courses.length} séances` : "La séance";
  const summary = `${minutes ? `${hoursLabel(minutes)} sur ${totalHours} h · ` : ""}${ready} sur ${courses.length} ${courses.length > 1 ? "prêtes" : "prête"}`;
  const body = (
    <>
      <ol>
        {courses.map((c, i) => {
          const current = c.id === currentId;
          return (
            <li key={c.id}>
              <Link
                href={`/modules/${moduleId}/courses/${c.id}`}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "focus-visible:ring-ring flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 focus-visible:ring-2 focus-visible:outline-none",
                  current ? "bg-primary/15 border-primary/60" : "hover:bg-accent",
                )}
              >
                <strong className="w-5">{i + 1}</strong>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "line-clamp-2 block text-sm break-words",
                      current ? "font-bold" : "font-medium",
                    )}
                  >
                    {c.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {listDateLine(c.session_date, c.start_time, c.end_time)}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {!c.completion && c.session_date && c.session_date < today ? (
                    // Séance passée jamais clôturée : jamais « Prochaine ».
                    <Pill tone="warn" className="min-h-[1.375rem] px-2 text-xs">
                      À clôturer
                    </Pill>
                  ) : c.id === upcomingId ? (
                    <Pill tone="key" className="min-h-[1.375rem] px-2 text-xs">
                      {c.session_date === today ? "Aujourd’hui" : "Prochaine"}
                    </Pill>
                  ) : null}
                  <Pill
                    tone={
                      c.completion
                        ? "ok"
                        : isSessionReady(c) && toBuild(c) > 0
                          ? "warn"
                          : (STATUS_TONES[c.prep_status] ?? "plain")
                    }
                    className="min-h-[1.375rem] px-2 text-xs"
                  >
                    {c.completion ? "Faite" : statusLabel(c.prep_status)}
                  </Pill>
                  {!c.completion && isSessionReady(c) && toBuild(c) > 0 ? (
                    <span className="text-sun text-right text-xs leading-tight font-semibold">
                      {toBuild(c)} ressource{toBuild(c) > 1 ? "s" : ""} à construire
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {hoursMessage ? (
        <Notice level="warning" title="À vérifier" className="mx-1.5 mt-2">
          {hoursMessage}
        </Notice>
      ) : null}
      {missing.length ? (
        <div className="bg-muted mx-1.5 mt-2.5 rounded-xl p-3 text-[0.8125rem]">
          <strong>
            {missing.length} attendu{missing.length > 1 ? "s" : ""} sans séance
          </strong>
          <p className="text-muted-foreground mt-0.5">
            {missing
              .slice(0, 3)
              .map((m) => `« ${m} »`)
              .join(", ")}
          </p>
        </div>
      ) : null}
      <div className="mx-1.5 mt-3 flex flex-wrap items-start gap-2">
        {/* Un seul bouton d'ajout, avec ses trois façons de faire. */}
        <DisclosureMenu label="Ajouter une séance">
          <ul className="space-y-1">
            <li>
              <Link
                href={`/modules/${moduleId}/courses/new`}
                className="hover:bg-muted flex min-h-11 items-center rounded-lg px-3 text-sm"
              >
                Une séance vide
              </Link>
            </li>
            <li>
              <Link
                href={`/modules/${moduleId}/schedule`}
                className="hover:bg-muted flex min-h-11 items-center rounded-lg px-3 text-sm"
              >
                Depuis un planning
              </Link>
            </li>
            <li>
              <Link
                href={`/modules/${moduleId}/import-courses`}
                className="hover:bg-muted flex min-h-11 items-center rounded-lg px-3 text-sm"
              >
                Depuis un autre module
              </Link>
            </li>
          </ul>
        </DisclosureMenu>
        {courses.length ? (
          <Link href={`/modules/${moduleId}/planning`} className={BTN}>
            Planning du module
          </Link>
        ) : null}
        {courses.length ? (
          <Link href={`/modules/${moduleId}/frise`} className={BTN}>
            Frise du module
          </Link>
        ) : null}
      </div>
    </>
  );

  if (layout === "drawer") {
    const current = courses.findIndex((c) => c.id === currentId);
    return (
      <section aria-labelledby="ls-drawer">
        <h2 id="ls-drawer" className="sr-only text-sm font-semibold">
          {heading}
        </h2>
        <details className="bg-card min-w-0 rounded-xl border p-3">
          <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-1.5">
            <span className="font-heading text-base font-bold">{heading}</span>
            <span className="text-muted-foreground text-sm">
              {current >= 0 ? `Séance ${current + 1} ouverte · ` : ""}
              {summary}
            </span>
          </summary>
          <div className="pt-2">{body}</div>
        </details>
      </section>
    );
  }

  return (
    <aside
      aria-labelledby="ls"
      className="bg-card w-full min-w-0 rounded-xl border p-3.5 lg:w-80 lg:flex-none"
    >
      <h2 id="ls" className="mx-1.5 text-sm font-semibold">
        {heading}
      </h2>
      <p className="text-muted-foreground mx-1.5 mb-2 text-[0.8125rem]">{summary}</p>
      {body}
    </aside>
  );
}
