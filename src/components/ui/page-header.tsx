/**
 * En-tête de page commun (lot G) : titre (h1, style unique de la DA « Atelier »), ligne de
 * métadonnées (chiffres en 600), une action principale, deux secondaires au plus, et une aide
 * repliable « ? ». Le fil d'Ariane et les onglets sont posés au-dessus par `PlaceNav`.
 */
export function PageHeader({
  title,
  meta,
  actions,
  help,
}: {
  title: React.ReactNode;
  /** Ligne de métadonnées : « 21 h de cours · 3 notes exigées… » (mettre les chiffres en <strong>). */
  meta?: React.ReactNode;
  /** Boutons : le principal en dernier (à droite). */
  actions?: React.ReactNode;
  /** Aide repliable. */
  help?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-3xl min-w-0">
        <h1>{title}</h1>
        {meta ? (
          <p className="text-muted-foreground [&_strong]:text-foreground mt-1 text-sm [&_strong]:font-semibold">
            {meta}
          </p>
        ) : null}
        {help ? (
          <details className="text-muted-foreground text-sm">
            <summary className="inline-flex min-h-11 cursor-pointer items-center">
              <span
                aria-hidden
                className="mr-1 inline-flex size-5 items-center justify-center rounded-full border text-xs"
              >
                ?
              </span>
              Aide
            </summary>
            <div className="pb-2">{help}</div>
          </details>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
