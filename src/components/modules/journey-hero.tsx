import Link from "next/link";

import { FinishModuleButton } from "@/components/modules/finish-module-button";
import type { Hero } from "@/lib/modules/hero";

const PRIMARY =
  "bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 items-center justify-center rounded-xl px-5 font-semibold shadow-lg focus-visible:ring-2 focus-visible:outline-none";
const SECONDARY =
  "focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center justify-center rounded-xl border px-5 font-semibold focus-visible:ring-2 focus-visible:outline-none";

/** Grande carte « Prochaine étape » / « Tout est prêt » / « Ce module est terminé ». */
export function JourneyHero({
  hero,
  moduleId,
  moduleName,
  askNote,
}: {
  hero: Hero;
  moduleId: string;
  moduleName: string;
  askNote: boolean;
}) {
  return (
    <section
      aria-labelledby="next"
      className="bg-primary/15 border-primary/60 rounded-3xl border p-6 sm:p-7"
    >
      <p className="text-primary mb-1.5 text-[0.8rem] font-bold tracking-wider uppercase">
        {hero.eyebrow}
      </p>
      <h2 id="next" className="font-heading text-2xl font-bold sm:text-3xl">
        {hero.title}
      </h2>
      <p className="mt-2 mb-4 max-w-xl">{hero.text}</p>
      <div className="flex flex-wrap items-center gap-3">
        {hero.primary ? (
          <Link href={hero.primary.href} className={PRIMARY}>
            {hero.primary.label}
          </Link>
        ) : null}
        {hero.offerFinish ? (
          <FinishModuleButton
            id={moduleId}
            name={moduleName}
            askNote={askNote}
            label="Terminer le module"
            prominent
          />
        ) : null}
        {hero.offerFinish ? (
          <Link href={`/modules/${moduleId}/finish`} className={SECONDARY}>
            Ce qu’il reste avant de terminer
          </Link>
        ) : null}
        {hero.secondary ? (
          <Link href={hero.secondary.href} className={SECONDARY}>
            {hero.secondary.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
