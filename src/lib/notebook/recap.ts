/**
 * US-137 : récapitulatif de fin de séance (fait / pas fait / reporté), à partir de la clôture
 * existante. Fonction pure. Le texte du retour personnel n'y figure jamais : seule sa présence.
 */
import type { CourseCompletion } from "./notebook";

export type RecapState = "done" | "partial" | "todo" | "carried";

export interface RecapItem {
  key: "completion" | "carried" | "next" | "observations" | "retro";
  state: RecapState;
  title: string;
  detail?: string;
}

export interface RecapInput {
  completion: CourseCompletion | null;
  notCovered: string | null;
  nextTime: string | null;
  /** Noms des étudiant·es observé·es pendant la séance (une entrée par observation). */
  observedNames: string[];
  hasRetro: boolean;
  /** Rang de la prochaine séance, s'il y en a une. */
  nextNumber: number | null;
}

const clean = (v: string | null) => v?.trim() || null;

/** Noms distincts, dans l'ordre d'apparition (« Camille R., Sami D. »). */
const distinct = (names: string[]) => [...new Set(names)];

export function closureRecap(i: RecapInput): RecapItem[] {
  const items: RecapItem[] = [];
  const notCovered = clean(i.notCovered);
  const nextTime = clean(i.nextTime);
  const where = i.nextNumber ? `la séance ${i.nextNumber}` : "la prochaine séance";

  switch (i.completion) {
    case "done":
      items.push({ key: "completion", state: "done", title: "Séance faite" });
      break;
    case "partial":
      items.push({
        key: "completion",
        state: "partial",
        title: "Faite en partie",
        detail: notCovered ? undefined : "Aucun point à reporter n’est noté.",
      });
      break;
    case "not_done":
      items.push({ key: "completion", state: "todo", title: "Non faite" });
      break;
    default:
      items.push({
        key: "completion",
        state: "todo",
        title: "Statut de la séance pas encore choisi",
        detail: "Choisis « faite », « partiellement faite » ou « non faite » dans la clôture.",
      });
  }

  items.push(
    notCovered
      ? {
          key: "carried",
          state: "carried",
          title: "À reporter",
          detail: `${notCovered} Rappelé au début de ${where}.`,
        }
      : { key: "carried", state: "done", title: "Rien à reporter" },
  );

  items.push(
    nextTime
      ? {
          key: "next",
          state: "done",
          title: "Consigne enregistrée pour la prochaine fois",
          detail: `« ${nextTime} » Projetée à l’ouverture de ${where}.`,
        }
      : {
          key: "next",
          state: "todo",
          title: "Pas de consigne pour la prochaine fois",
          detail: "Tu peux en écrire une ci-dessous : elle sera projetée à l’ouverture.",
        },
  );

  const names = distinct(i.observedNames);
  if (i.observedNames.length) {
    const n = i.observedNames.length;
    items.push({
      key: "observations",
      state: "done",
      title: `${n} observation${n > 1 ? "s" : ""} rangée${n > 1 ? "s" : ""} dans les fiches`,
      detail: `${names.join(", ")} · Rien à recopier.`,
    });
  }

  if (i.hasRetro) {
    items.push({
      key: "retro",
      state: "done",
      title: "Ton retour personnel est gardé",
      detail: "Visible de toi seule, gardé avec le module.",
    });
  }
  return items;
}
