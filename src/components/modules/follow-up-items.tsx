import type { FollowUpItem } from "@/lib/deposits/follow-up";

/** Documents enregistrés sur un point d'étape, avec leur téléchargement. */
export function FollowUpItems({
  items,
  fileHref,
}: {
  items: FollowUpItem[];
  fileHref: (item: FollowUpItem) => string;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="docs-recus" className="bg-card mt-7 rounded-xl border p-5">
      <h2 id="docs-recus" className="text-sm font-semibold">
        Document{items.length > 1 ? "s" : ""} bien reçu{items.length > 1 ? "s" : ""}
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((it) => (
          <li key={it.id}>
            {it.kind === "link" && it.url ? (
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all underline underline-offset-2"
              >
                {it.name}
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            ) : (
              <a href={fileHref(it)} className="break-all underline underline-offset-2">
                Télécharger {it.name}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
