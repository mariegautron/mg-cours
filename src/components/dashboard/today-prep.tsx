import Link from "next/link";
import { Check } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { sessionReadiness } from "@/lib/dashboard/readiness";
import type { SessionPrep } from "@/lib/dashboard/queries";
import type { PreviousSession } from "@/lib/dashboard/overview-queries";
import { formatSessionDay } from "@/lib/dashboard/today";

const LINK =
  "focus-visible:ring-ring text-primary inline-flex min-h-11 items-center rounded-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none";

const BTN =
  "focus-visible:ring-ring inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none hover:bg-accent";

/**
 * Jour de cours (maquette « Aujourd'hui ») : trois cartes — ce qu'on avait dit la dernière fois,
 * « Prêt pour aujourd'hui ? » et « Tes étudiant·es ». L'état est écrit en mots, pas seulement par l'icône.
 */
export function TodayPrep({
  prep,
  moduleId,
  courseId,
  title,
  previous,
  observations,
}: {
  prep: SessionPrep;
  moduleId: string;
  courseId: string;
  title: string;
  previous: PreviousSession | null;
  observations: number;
}) {
  const readiness = sessionReadiness(prep.readiness);
  const id = `prep-${courseId}`;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section aria-labelledby={`${id}-last`} className="bg-card rounded-3xl border p-5 shadow-sm">
        <h3 id={`${id}-last`} className="font-heading mb-2 text-lg font-bold">
          Ce qu’on avait dit la dernière fois<span className="sr-only"> — {title}</span>
        </h3>
        {previous ? (
          <>
            <p className="text-muted-foreground mb-2 text-sm">
              Séance {previous.number}
              {previous.date ? ` · ${formatSessionDay(previous.date)}` : ""}
            </p>
            <p className="font-semibold">Consigne donnée aux étudiant·es :</p>
            <p className="text-muted-foreground mb-3 text-sm whitespace-pre-wrap">
              {previous.nextTime
                ? previous.nextTime
                : "Aucune consigne notée à la fin de la séance."}
            </p>
            <p className="font-semibold">Non traité, à reporter :</p>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {previous.notCovered ? previous.notCovered : "Rien de noté."}
            </p>
            {previous.nextTime ? (
              <p className="text-muted-foreground mt-3 text-sm">
                Cette consigne ouvrira la séance, projetée aux étudiant·es.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            C’est la première séance du module : rien à reprendre.
          </p>
        )}
      </section>

      <section aria-labelledby={`${id}-ready`} className="bg-card rounded-3xl border p-5 shadow-sm">
        <h3 id={`${id}-ready`} className="font-heading mb-1 text-lg font-bold">
          Prêt pour aujourd’hui ?<span className="sr-only"> — {title}</span>
        </h3>
        <p className="text-muted-foreground mb-1 text-sm" role="status">
          {readiness.allReady
            ? "Tout est prêt, bon cours."
            : `${readiness.readyCount} point${readiness.readyCount > 1 ? "s" : ""} prêt${readiness.readyCount > 1 ? "s" : ""} sur ${readiness.items.length}.`}
        </p>
        <ul>
          {readiness.items.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-2.5 border-t py-2.5 text-sm first:border-t-0"
            >
              <span
                aria-hidden
                className={`mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  item.ok ? "bg-mint text-background" : "border-sun text-sun border-[1.5px]"
                }`}
              >
                {item.ok ? <Check className="size-3" strokeWidth={4} /> : "!"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  <span className="sr-only">{item.ok ? "Prêt : " : "À faire : "}</span>
                  {item.title}
                </p>
                {item.detail ? <p className="text-muted-foreground">{item.detail}</p> : null}
                {item.action ? (
                  <Link href={item.action.href} className={LINK}>
                    {item.action.label}
                    <span className="sr-only"> : {title}</span>
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby={`${id}-students`}
        className="bg-card rounded-3xl border p-5 shadow-sm"
      >
        <h3 id={`${id}-students`} className="font-heading mb-2 text-lg font-bold">
          Tes étudiant·es<span className="sr-only"> — {title}</span>
        </h3>
        <p>
          <strong>
            {prep.studentCount} étudiant·e{prep.studentCount > 1 ? "s" : ""}
          </strong>{" "}
          · {prep.groupCount} groupe{prep.groupCount > 1 ? "s" : ""}
        </p>
        <p className="text-muted-foreground mb-3 text-sm">
          {observations} observation{observations > 1 ? "s" : ""} notée{observations > 1 ? "s" : ""}{" "}
          aux séances précédentes.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/students" className={BTN}>
            Voir le trombinoscope
          </Link>
          <Link href={`/modules/${moduleId}/groups/wizard`} className={BTN}>
            Voir ou refaire les groupes
          </Link>
        </div>
        <div className="mt-4 border-t pt-3">
          <p className="mb-1 font-semibold">
            L’appel <Pill tone="warn">À faire</Pill>
          </p>
          <p className="text-muted-foreground mb-2 text-sm">Il se fait dans Edusign.</p>
          <a
            href="https://edusign.app/professor/home"
            target="_blank"
            rel="noopener noreferrer"
            className={BTN}
          >
            Ouvrir Edusign<span className="sr-only"> — s’ouvre dans un nouvel onglet</span>
          </a>
        </div>
      </section>
    </div>
  );
}
