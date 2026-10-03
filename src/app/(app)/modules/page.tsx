import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Pill } from "@/components/dashboard/pill";
import { ModuleRowActions } from "@/components/modules/module-row-actions";
import { listCourseProgress } from "@/lib/dashboard/overview-queries";
import { getModuleJourney } from "@/lib/modules/journey-queries";
import {
  FILTERS,
  filterCounts,
  inFilter,
  metaLine,
  moduleListState,
  parseListFilter,
  schoolYearOf,
  statePill,
  type ListFilter,
} from "@/lib/modules/list-state";
import { listModules } from "@/lib/modules/queries";
import { retrospectiveAvailable } from "@/lib/modules/retrospective-queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Modules" };

const CHIP =
  "focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl border-[1.5px] px-3.5 text-sm font-semibold whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none";

const EMPTY: Record<ListFilter, { title: string; description: string }> = {
  running: {
    title: "Aucun module en cours",
    description:
      "Un module commence dès que sa première séance est faite. Prépare le suivant ou crée-en un.",
  },
  to_prepare: {
    title: "Rien à préparer",
    description: "Tous tes modules ont déjà commencé. Crée un module pour la prochaine rentrée.",
  },
  finished: {
    title: "Aucun module terminé",
    description:
      "« Terminer » range un module dans cette liste une fois les cours faits et les notes saisies.",
  },
  archived: {
    title: "Aucun module rangé",
    description: "« Ranger » masque un module sans rien effacer : tu le retrouves ici.",
  },
};

export default async function ModulesPage({ searchParams }: PageProps<"/modules">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  // Anciennes URL : ?filter=archived → Rangés ; ?filter=all → En cours.
  const rawFilter = str("filter");
  const filter = parseListFilter(rawFilter === "all" ? "running" : rawFilter);
  const schoolId = str("school");
  const year = str("year");

  const [all, progress, askNote] = await Promise.all([
    listModules({ includeArchived: true }),
    listCourseProgress(),
    retrospectiveAvailable(),
  ]);
  const rows = all.map((m) => {
    const courses = progress.get(m.id) ?? { done: 0, total: 0 };
    return { m, courses, state: moduleListState({ ...m, courses }) };
  });

  const schools = [
    ...new Map(all.filter((m) => m.school).map((m) => [m.school!.id, m.school!.name])).entries(),
  ];
  const years = [...new Set(all.map((m) => schoolYearOf(m.year)))].sort().reverse();
  const scoped = rows.filter(
    (r) => (!schoolId || r.m.school_id === schoolId) && (!year || schoolYearOf(r.m.year) === year),
  );
  const counts = filterCounts(scoped.map((r) => r.state));
  const shown = scoped.filter((r) => inFilter(r.state, filter));

  // « Prochaine étape » : le parcours du module (non rangé).
  const journeys = new Map(
    await Promise.all(
      shown
        .filter((r) => r.state !== "archived")
        .map(async (r) => [r.m.id, (await getModuleJourney(r.m.id))?.badge ?? null] as const),
    ),
  );

  const href = (f: ListFilter, extra: { school?: string; year?: string } = {}) => {
    const params = new URLSearchParams();
    if (f !== "running") params.set("filter", f);
    const s = extra.school ?? schoolId;
    const y = extra.year ?? year;
    if (s) params.set("school", s);
    if (y) params.set("year", y);
    const qs = params.toString();
    return qs ? `/modules?${qs}` : "/modules";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Modules</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Chaque ligne dit où en est le module et ce qu’il faut faire ensuite. Tu peux terminer ou
            ranger un module depuis ici.
          </p>
        </div>
        <Link
          href="/modules/new"
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-12 items-center rounded-xl px-5 font-semibold shadow-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          Créer un module
        </Link>
      </div>

      <nav aria-label="Filtrer les modules" className="flex flex-wrap items-center gap-2.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href(f.key)}
            aria-current={filter === f.key ? "page" : undefined}
            className={cn(
              CHIP,
              filter === f.key
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-card hover:bg-accent",
            )}
          >
            {f.label} · {counts[f.key]}
          </Link>
        ))}
        <form action="/modules" className="flex flex-wrap items-center gap-2.5">
          {filter !== "running" ? <input type="hidden" name="filter" value={filter} /> : null}
          <label className="sr-only" htmlFor="school">
            École
          </label>
          <select
            id="school"
            name="school"
            defaultValue={schoolId}
            className={cn(CHIP, "bg-card")}
            aria-label="École"
          >
            <option value="">Toutes les écoles</option>
            {schools.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="year">
            Année scolaire
          </label>
          <select
            id="year"
            name="year"
            defaultValue={year}
            className={cn(CHIP, "bg-card")}
            aria-label="Année scolaire"
          >
            <option value="">Toutes les années</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="submit" className={cn(CHIP, "bg-card hover:bg-accent")}>
            Filtrer
          </button>
        </form>
      </nav>

      {all.length === 0 ? (
        <EmptyState
          title="Aucun module"
          description="Un module regroupe les séances, les évaluations et la facture d’un cours."
          actions={[{ label: "Créer un module", href: "/modules/new" }]}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title={EMPTY[filter].title}
          description={EMPTY[filter].description}
          actions={[{ label: "Créer un module", href: "/modules/new" }]}
        />
      ) : (
        <section
          aria-label="Liste des modules"
          className="bg-card rounded-3xl border px-5 shadow-sm"
        >
          <ul>
            {shown.map(({ m, courses, state }) => {
              const pill = statePill(state, courses);
              const next = journeys.get(m.id);
              return (
                <li
                  key={m.id}
                  className="flex min-h-[84px] flex-wrap items-center gap-3 border-t py-3 first:border-t-0"
                >
                  <Link
                    href={`/modules/${m.id}`}
                    className="focus-visible:ring-ring min-w-0 flex-1 basis-64 rounded-md focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <h2 className="text-[1.05rem] font-bold">{m.name}</h2>
                    <p className="text-muted-foreground text-sm">
                      {metaLine({
                        ycode: m.ycode,
                        schoolName: m.school?.name ?? null,
                        level: m.level,
                        totalHours: m.total_hours,
                        firstSessionDate: m.first_session_date,
                        state,
                      })}
                    </p>
                    {state === "archived" ? (
                      <p className="mt-0.5 text-sm">
                        Rangé le {new Date(m.archived_at!).toLocaleDateString("fr-FR")}
                      </p>
                    ) : next ? (
                      <p className="mt-0.5 text-sm">{next}</p>
                    ) : null}
                  </Link>
                  <Pill tone={pill.tone}>{pill.label}</Pill>
                  <ModuleRowActions id={m.id} name={m.name} state={state} askNote={askNote} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="focus-visible:ring-ring hover:bg-accent inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          ← Aujourd’hui
        </Link>
        <Link
          href="/assessments"
          className="focus-visible:ring-ring hover:bg-accent inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          Évaluations
        </Link>
        <Link
          href="/billing"
          className="focus-visible:ring-ring hover:bg-accent inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          Facturation
        </Link>
      </div>
    </div>
  );
}
