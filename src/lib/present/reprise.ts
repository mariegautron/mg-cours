/**
 * US-68 : reprise à la séance suivante. « À faire pour la prochaine fois » (`next_time`, saisi à
 * la clôture de la séance précédente) alimente la diapositive « Pour aujourd'hui, vous
 * deviez… ». C'est le SEUL champ de clôture qui peut sortir vers l'écran : ni PDF ni e-mail, et
 * jamais les autres champs du carnet (voir `privacy.test.ts`).
 */

const BULLET = /^\s*(?:[-•*·▪●◦–—]|\d{1,2}\s*[.)])\s+/;
const MAX_LINES = 12;

/** Une ligne = un point ; puces retirées, lignes vides ignorées. */
export function repriseLines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(BULLET, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, MAX_LINES);
}

/** Ce qui était demandé à la séance précédente du module (rang `position`, à partir de 0). */
export function previousNextTime(
  courses: { next_time: string | null }[],
  position: number,
): string[] {
  return position > 0 ? repriseLines(courses[position - 1]?.next_time) : [];
}
