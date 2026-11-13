import { repriseLines } from "@/lib/present/reprise";

/**
 * « Reprise de la séance précédente » : ce que Marie a demandé aux étudiant·es (déjà projeté à
 * l'ouverture) et les points non traités à reporter (privés, jamais projetés). Rendu dans
 * « Avant de commencer » et dans la vue privée.
 */
export function PreviousRecap({
  nextTime,
  notCovered,
  className = "",
}: {
  nextTime: string | null | undefined;
  notCovered: string | null | undefined;
  className?: string;
}) {
  const asked = repriseLines(nextTime);
  const carried = repriseLines(notCovered);
  if (asked.length === 0 && carried.length === 0) return null;
  return (
    <section
      aria-labelledby="previous-recap"
      className={`bg-card space-y-2 rounded-xl border p-4 ${className}`}
    >
      <h2 id="previous-recap" className="font-medium">
        Reprise de la séance précédente
      </h2>
      {asked.length ? (
        <div className="text-sm">
          <p className="text-muted-foreground font-medium">Demandé aux étudiant·es</p>
          <ul className="list-disc pl-5">
            {asked.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {carried.length ? (
        <div className="text-sm">
          <p className="text-muted-foreground font-medium">
            Points non traités, à reporter <span className="font-normal">(jamais projetés)</span>
          </p>
          <ul className="list-disc pl-5">
            {carried.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
