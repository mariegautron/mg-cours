import Link from "next/link";
import { Check, TriangleAlert } from "lucide-react";

import { sessionReadiness } from "@/lib/dashboard/readiness";
import type { SessionPrep } from "@/lib/dashboard/queries";

/**
 * Jour de cours : « Prêt pour aujourd'hui ? » (checklist calculée, un lien pour compléter chaque
 * point) et « Tes étudiant·es » (groupes, trombinoscope, rappel de l'appel). L'état est écrit en
 * mots, pas seulement par l'icône.
 */
export function TodayPrep({
  prep,
  moduleId,
  courseId,
  title,
}: {
  prep: SessionPrep;
  moduleId: string;
  courseId: string;
  title: string;
}) {
  const readiness = sessionReadiness(prep.readiness);
  const id = `prep-${courseId}`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-labelledby={`${id}-ready`} className="bg-card rounded-2xl border p-5">
        <h3 id={`${id}-ready`} className="font-heading text-lg font-semibold">
          Prêt pour aujourd’hui ?<span className="sr-only"> — {title}</span>
        </h3>
        <p className="text-muted-foreground mb-2 text-sm" role="status">
          {readiness.allReady
            ? "Tout est prêt, bon cours."
            : `${readiness.readyCount} point${readiness.readyCount > 1 ? "s" : ""} prêt${readiness.readyCount > 1 ? "s" : ""} sur ${readiness.items.length}.`}
        </p>
        <ul className="divide-y">
          {readiness.items.map((item) => (
            <li key={item.key} className="flex items-start gap-3 py-2.5">
              <span
                aria-hidden
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                  item.ok ? "bg-mint/20 text-mint" : "bg-sun/20 text-sun"
                }`}
              >
                {item.ok ? <Check className="size-4" /> : <TriangleAlert className="size-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <span className="sr-only">{item.ok ? "Prêt : " : "À faire : "}</span>
                  {item.title}
                </p>
                {item.detail ? (
                  <p className="text-muted-foreground text-sm">{item.detail}</p>
                ) : null}
                {item.action ? (
                  <Link
                    href={item.action.href}
                    className="focus-visible:ring-ring inline-flex min-h-11 items-center rounded-sm text-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {item.action.label}
                    <span className="sr-only"> : {title}</span>
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${id}-students`} className="bg-card rounded-2xl border p-5">
        <h3 id={`${id}-students`} className="font-heading text-lg font-semibold">
          Tes étudiant·es<span className="sr-only"> — {title}</span>
        </h3>
        <p className="mt-1">
          <strong>
            {prep.studentCount} étudiant·e{prep.studentCount > 1 ? "s" : ""}
          </strong>{" "}
          · {prep.groupCount} groupe{prep.groupCount > 1 ? "s" : ""}
        </p>
        <p className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/modules/${moduleId}#groups-evaluations`}
            className="focus-visible:ring-ring inline-flex min-h-11 items-center rounded-sm text-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
          >
            Voir les groupes du module
          </Link>
          <Link
            href="/students"
            className="focus-visible:ring-ring inline-flex min-h-11 items-center rounded-sm text-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
          >
            Voir les étudiant·es
          </Link>
        </p>
        <div className="mt-3 border-t pt-3">
          <p className="font-medium">L’appel</p>
          <p className="text-muted-foreground text-sm">
            Ouvre l’appel sur Edusign avant de commencer : il ne se fait pas dans cette appli.
          </p>
        </div>
      </section>
    </div>
  );
}
