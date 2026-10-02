/**
 * US-135 : noter un·e étudiant·e en direct, au clavier — logique pure (recherche, navigation,
 * raccourcis d'étiquette, formatage). Données privées : voir privacy.test.ts.
 */
import { OBSERVATION_TAGS, OBSERVATION_TAG_LABELS, type ObservationTag } from "./notebook";
import { normalize } from "@/lib/search/search";

interface Named {
  id: string;
  first_name: string;
  last_name: string;
}

/**
 * Recherche d'un·e étudiant·e à la saisie : chaque mot doit se trouver dans « prénom nom » ou
 * « nom prénom » (accents et casse ignorés). Ceux dont un mot du nom commence par la saisie
 * passent avant ; à égalité, ordre alphabétique (nom, prénom).
 */
export function findStudents<S extends Named>(students: S[], query: string): S[] {
  const words = normalize(query).split(" ").filter(Boolean);
  const scored = students
    .map((s) => {
      const name = normalize(`${s.first_name} ${s.last_name}`);
      const parts = name.split(" ");
      if (!words.every((w) => name.includes(w))) return null;
      const prefix = words.every((w) => parts.some((p) => p.startsWith(w))) ? 0 : 1;
      return { s, prefix };
    })
    .filter((x): x is { s: S; prefix: 0 | 1 } => x !== null);
  return scored
    .sort(
      (a, b) =>
        a.prefix - b.prefix ||
        normalize(a.s.last_name).localeCompare(normalize(b.s.last_name), "fr") ||
        normalize(a.s.first_name).localeCompare(normalize(b.s.first_name), "fr"),
    )
    .map((x) => x.s);
}

/** Ramène l'index actif dans la liste (-1 si elle est vide). */
export function clampActive(index: number, count: number): number {
  if (count <= 0) return -1;
  return Math.min(Math.max(index, 0), count - 1);
}

/** Navigation au clavier dans la liste : flèches (en boucle), Début, Fin. `null` : touche ignorée. */
export function moveActive(index: number, key: string, count: number): number | null {
  if (count <= 0) return null;
  const current = clampActive(index, count);
  switch (key) {
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** Raccourci d'étiquette : « 1 » à « 5 » dans l'ordre affiché. */
export function tagForKey(key: string): ObservationTag | null {
  if (!/^[1-9]$/.test(key)) return null;
  return OBSERVATION_TAGS[Number(key) - 1]?.value ?? null;
}

/** Confirmation annoncée après l'enregistrement. */
export function observationAddedMessage(name: string, tag: ObservationTag): string {
  return `Observation ajoutée pour ${name} — ${OBSERVATION_TAG_LABELS[tag]}.`;
}

/** « 12/10 · Participation « A relancé le débat. » » : une observation datée, sur une ligne. */
export function formatObservation(o: {
  createdAt: string;
  tag: ObservationTag;
  note: string | null;
}): string {
  const date = new Date(o.createdAt).toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
  });
  const note = o.note?.trim();
  return `${date} · ${OBSERVATION_TAG_LABELS[o.tag]}${note ? ` « ${note} »` : ""}`;
}
