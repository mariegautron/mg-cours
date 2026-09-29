import type { FicheData } from "./fiche";

/**
 * Brouillon de « Présentation aux étudiant·es » depuis la fiche pédagogique. Texte destiné aux
 * étudiant·es : vouvoiement, écriture inclusive au point médian. Fonction pure, jamais
 * enregistrée toute seule : Marie relit et modifie avant d'enregistrer le module.
 */

/** Noms de personnes au masculin pluriel que les fiches d'école emploient, et leur forme inclusive. */
// `\b` ne connaît pas les lettres accentuées : on borne avec des lookarounds.
const START = String.raw`(?<![\wÀ-ÿ])`;
const END = String.raw`(?![\wÀ-ÿ·])`;
const INCLUSIVE: [RegExp, string][] = [
  [new RegExp(`${START}([ÉEée]tudiant)s${END}`, "g"), "$1·es"],
  [new RegExp(`${START}([Aa]pprenant)s${END}`, "g"), "$1·es"],
  [new RegExp(`${START}([Ii]ntervenant)s${END}`, "g"), "$1·es"],
  [new RegExp(`${START}([Pp]articipant)s${END}`, "g"), "$1·es"],
  [new RegExp(`${START}([Dd]iplômé)s${END}`, "g"), "$1·es"],
];

/** Passe un texte d'école (souvent au masculin pluriel) à l'écriture inclusive. */
export function inclusify(text: string): string {
  return INCLUSIVE.reduce((t, [re, to]) => t.replace(re, to), text);
}

const trimFinalDot = (s: string) => s.replace(/[\s.;:]+$/, "");

/** « Cartographier… » → « cartographier… » ; un sigle ou un nom propre en tête reste tel quel. */
function lowerFirst(s: string): string {
  return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function firstSentence(text: string): string {
  const match = /^.+?[.!?](?=\s|$)/.exec(text.trim());
  return (match ? match[0] : text).trim();
}

function hoursLine(fiche: FicheData): string | null {
  if (!fiche.totalHours) return null;
  const h = (n: number) => `${String(n).replace(".", ",")} h`;
  const parts = [
    fiche.hoursLecture ? `${h(fiche.hoursLecture)} de cours` : null,
    fiche.hoursTd ? `${h(fiche.hoursTd)} de TD` : null,
    fiche.hoursTp ? `${h(fiche.hoursTp)} de TP` : null,
  ].filter(Boolean);
  return `Ce module représente ${h(fiche.totalHours)} d’enseignement${parts.length ? ` (${parts.join(", ")})` : ""}.`;
}

/** Brouillon Markdown : sections ajoutées seulement quand la fiche les fournit. */
export function buildStudentIntro(fiche: FicheData): string {
  const blocks: string[] = ["## Bienvenue !"];

  const opening = fiche.name
    ? `Bienvenue dans le module « ${fiche.name} ».`
    : "Bienvenue dans ce module.";
  const description = fiche.description ? inclusify(firstSentence(fiche.description)) : "";
  blocks.push(description ? `${opening} ${description}` : opening);

  if (fiche.objectives?.length) {
    blocks.push(
      [
        "## Ce que vous saurez faire",
        "À l’issue du module, vous serez capable de :",
        ...fiche.objectives.map((o) => `- ${lowerFirst(trimFinalDot(inclusify(o)))}`),
      ].join("\n"),
    );
  }

  if (fiche.prerequisites?.length) {
    const items = fiche.prerequisites.map((p) => trimFinalDot(inclusify(p)));
    blocks.push(
      items.length === 1
        ? `## Prérequis\nCe module s’appuie sur : ${items[0]}.`
        : ["## Prérequis", "Ce module s’appuie sur :", ...items.map((i) => `- ${i}`)].join("\n"),
    );
  }

  const hours = hoursLine(fiche);
  if (hours) blocks.push(`## Volume horaire\n${hours}`);

  blocks.push("Nous avons hâte de travailler avec vous. Bon module, et à très vite !");
  return blocks.join("\n\n") + "\n";
}
