import Link from "next/link";

import { Pill } from "@/components/dashboard/pill";
import type { CourseWithResources } from "@/lib/modules/queries";
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
}: {
  moduleId: string;
  courses: CourseWithResources[];
  currentId: string | null;
  totalHours: number;
  /** Attendus qu'aucune séance ne couvre. */
  missing: string[];
  /** Écart entre les heures planifiées et celles du module. */
  hoursMessage?: string | null;
}) {
  const minutes = courses.reduce((n, c) => n + (minutesBetween(c.start_time, c.end_time) ?? 0), 0);
  const ready = courses.filter((c) => c.prep_status === "ready").length;
  const BTN =
    "focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none";
  return (
    <aside
      aria-labelledby="ls"
      className="bg-card w-full min-w-0 rounded-3xl border p-3.5 shadow-sm lg:w-80 lg:flex-none"
    >
      <h2 id="ls" className="font-heading mx-1.5 text-lg font-bold">
        {courses.length > 1 ? `Les ${courses.length} séances` : "La séance"}
      </h2>
      <p className="text-muted-foreground mx-1.5 mb-2 text-[0.8rem]">
        {minutes ? `${hoursLabel(minutes)} sur ${totalHours} h · ` : ""}
        {ready} sur {courses.length} {courses.length > 1 ? "prêtes" : "prête"}
      </p>
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
                    className={cn("block truncate text-sm", current ? "font-bold" : "font-medium")}
                  >
                    {c.title}
                  </span>
                  <span className="text-muted-foreground block text-[0.75rem]">
                    {listDateLine(c.session_date, c.start_time, c.end_time)}
                  </span>
                </span>
                <Pill
                  tone={STATUS_TONES[c.prep_status] ?? "plain"}
                  className="min-h-[22px] px-2 text-[0.75rem]"
                >
                  {statusLabel(c.prep_status)}
                </Pill>
              </Link>
            </li>
          );
        })}
      </ol>
      {hoursMessage ? (
        <p role="status" className="text-destructive mx-1.5 mt-2 text-[0.8rem]">
          <span className="font-semibold">À vérifier :</span> {hoursMessage}
        </p>
      ) : null}
      {missing.length ? (
        <div className="bg-muted mx-1.5 mt-2.5 rounded-xl p-3 text-[0.8rem]">
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
      <div className="mx-1.5 mt-3 flex flex-wrap gap-2">
        <Link href={`/modules/${moduleId}/courses/new`} className={BTN}>
          Ajouter une séance
        </Link>
        <Link href={`/modules/${moduleId}/schedule`} className={BTN}>
          Depuis un planning
        </Link>
        <Link href={`/modules/${moduleId}/import-courses`} className={BTN}>
          Depuis un autre module
        </Link>
        {courses.length ? (
          <Link href={`/modules/${moduleId}/frise`} className={BTN}>
            Frise du module
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
