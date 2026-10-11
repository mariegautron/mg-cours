import Link from "next/link";

import type {
  PlanningCategory,
  PlanningDay,
  PlanningRow,
  PlanningSession,
} from "@/lib/modules/planning";

/** Hauteur d'une minute dans l'agenda, en pixels. */
const PX = 2.2;

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

const hm = (t: string | null) => (t ? t.slice(0, 5) : "—");

const LEGEND: { key: PlanningCategory; label: string; classes: string }[] = [
  { key: "cours", label: "Cours", classes: "border-sky-500/60 bg-sky-500/15" },
  {
    key: "pratique",
    label: "Exercice, atelier",
    classes: "border-emerald-500/60 bg-emerald-500/15",
  },
  { key: "projet", label: "Projet fil rouge", classes: "border-violet-500/60 bg-violet-500/15" },
  { key: "evaluation", label: "Évaluation", classes: "border-amber-500/70 bg-amber-500/20" },
];
const CLASSES = Object.fromEntries(LEGEND.map((l) => [l.key, l.classes])) as Record<string, string>;

function Block({ row }: { row: PlanningRow }) {
  const height = Math.max(row.displayMinutes * PX - 3, 18);
  const compact = row.displayMinutes < 25;
  const pause = row.kind === "pause";
  return (
    <li
      className={`absolute right-0 left-0 overflow-hidden rounded-xl border px-2.5 py-1 text-sm leading-snug ${
        pause
          ? "text-muted-foreground border-dashed italic"
          : `font-medium ${CLASSES[row.category ?? "cours"]}`
      }`}
      style={{ top: row.displayOffset * PX, height }}
    >
      {compact ? (
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate">{row.title}</span>
          <span className="shrink-0 font-mono text-xs">{row.minutes} min</span>
        </span>
      ) : (
        <>
          <span className="block">{row.title}</span>
          <span className="text-muted-foreground block font-mono text-xs font-normal not-italic">
            {row.start}–{row.end} ·{" "}
            {row.minutes >= 90
              ? `${Math.floor(row.minutes / 60)} h ${String(row.minutes % 60).padStart(2, "0")}`
              : `${row.minutes} min`}
          </span>
        </>
      )}
    </li>
  );
}

function SessionAgenda({ s, moduleId }: { s: PlanningSession; moduleId: string }) {
  const total = s.displayTotal * PX;
  return (
    <article className="bg-background rounded-2xl border p-4">
      <h3 className="font-semibold">
        <Link
          href={`/modules/${moduleId}/courses/${s.id}`}
          className="underline underline-offset-2"
        >
          Séance {s.position} · {hm(s.startTime)}–{hm(s.endTime)}
        </Link>
      </h3>
      <p className="text-muted-foreground mb-3 text-sm">{s.title}</p>
      {s.rows.length ? (
        <div className="flex gap-3">
          <div className="relative w-11 shrink-0" aria-hidden="true" style={{ height: total }}>
            {s.rows.map((r) => (
              <span
                key={`${r.start}-${r.title}`}
                className="text-muted-foreground absolute right-0 font-mono text-xs"
                style={{ top: r.displayOffset * PX + 3 }}
              >
                {r.start}
              </span>
            ))}
          </div>
          <ol className="relative min-w-0 flex-1" style={{ height: total }}>
            {s.rows.map((r) => (
              <Block key={`${r.start}-${r.title}`} row={r} />
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Aucun horaire renseigné pour les ressources de cette séance.
        </p>
      )}
      {s.assessments.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {s.assessments.map((a) => (
            <li key={a.title} className="rounded-full border px-3 py-0.5 text-xs font-semibold">
              {a.title}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/** Planning du module : un agenda par jour, un bloc coloré par activité, hauteur = durée. */
export function PlanningView({ days, moduleId }: { days: PlanningDay[]; moduleId: string }) {
  if (!days.length) {
    return <p className="text-muted-foreground">Ce module n’a pas encore de séance.</p>;
  }
  const card = "bg-card rounded-3xl border p-5 shadow-sm";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Les jours du module" className="flex flex-wrap gap-2">
          {days.map((day, i) => (
            <a
              key={day.date ?? `sans-date-${i}`}
              href={`#jour-${i}`}
              className="bg-card hover:bg-accent rounded-full border px-4 py-1.5 text-sm font-semibold"
            >
              {day.date ? shortDate(day.date) : "Sans date"} ·{" "}
              {day.sessions.map((s) => `S${s.position}`).join(" ")}
            </a>
          ))}
        </nav>
        <ul aria-label="Légende" className="flex flex-wrap gap-2 text-xs font-medium">
          {LEGEND.map((l) => (
            <li key={l.key} className={`rounded-full border px-3 py-1 ${l.classes}`}>
              {l.label}
            </li>
          ))}
        </ul>
      </div>
      {days.map((day, i) => (
        <section
          key={day.date ?? `sans-date-${i}`}
          id={`jour-${i}`}
          aria-labelledby={`jour-t-${i}`}
          className={card}
        >
          <h2 id={`jour-t-${i}`} className="font-heading mb-4 text-xl font-bold capitalize">
            {day.date ? longDate(day.date) : "Date à fixer"}
          </h2>
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {day.sessions.map((s) => (
              <SessionAgenda key={s.id} s={s} moduleId={moduleId} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
