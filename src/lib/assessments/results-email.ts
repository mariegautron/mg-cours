import { formatNumber } from "@/lib/assessments/scoring";
import type { ResultSheet } from "@/lib/assessments/results";

/**
 * Corps de l'e-mail de restitution d'un·e étudiant·e (US-97) : le même contenu que la fiche PDF, en
 * texte, pour qu'il se lise sans ouvrir la pièce jointe. Tutoiement. Rien d'autre que la fiche :
 * ni carnet, ni observations, ni autres étudiant·es.
 */
export function resultsEmailSubject(sheet: Pick<ResultSheet, "title">): string {
  return `Vos résultats — ${sheet.title}`;
}

function pointsLine(c: ResultSheet["criteria"][number]): string {
  const points = c.points === null ? "—" : formatNumber(c.points);
  if (c.isBonus) return `${points} (bonus, max +${formatNumber(c.max)})`;
  return `${points} / ${formatNumber(c.max)}${c.autoValidated ? " (validé d’office)" : ""}`;
}

export function resultsEmailText(sheet: ResultSheet, firstName?: string): string {
  const lines: string[] = [`Bonjour${firstName ? ` ${firstName}` : ""},`, ""];
  lines.push(`Voici votre résultat pour « ${sheet.title} » (${sheet.moduleName}).`, "");

  if (sheet.attendance === "absent_excused" && sheet.value === null) {
    lines.push(
      "Votre absence est excusée : vous n’avez pas de note pour cette évaluation. Votre note sera celle du rattrapage.",
    );
  } else {
    if (sheet.attendance === "absent_unexcused")
      lines.push("Absence non prévenue : la note est de 0 (règle de l’école).", "");
    if (sheet.attendance === "absent_excused")
      lines.push(
        "Votre absence est excusée : vous gardez la note du groupe (règle de l’école).",
        "",
      );
    if (sheet.personalNote) lines.push(`Un mot pour vous : ${sheet.personalNote}`, "");
    lines.push(
      `Note : ${sheet.value === null ? "—" : formatNumber(sheet.value)} / ${formatNumber(sheet.maxScore)}${
        sheet.maxScore !== 20 && sheet.valueOn20 !== null
          ? ` (soit ${formatNumber(sheet.valueOn20)}/20)`
          : ""
      }`,
    );
    if (sheet.overflow) lines.push(`Total avec bonus : ${sheet.overflow}`);

    if (sheet.attendance === "present" && sheet.criteria.length) {
      lines.push("", "Détail par critère :");
      for (const c of sheet.criteria) {
        lines.push(`- ${c.label} : ${pointsLine(c)}`);
        if (c.level?.description) lines.push(`  Palier obtenu : ${c.level.description}`);
        if (c.comment) lines.push(`  ${c.comment}`);
      }
      for (const axis of sheet.axes) {
        if (axis.comment?.trim()) {
          lines.push(
            "",
            `Commentaire sur l’axe « ${axis.label ?? "Autres critères"} » :`,
            axis.comment.trim(),
          );
        }
      }
    }
  }

  for (const [heading, text] of [
    ["Vos points forts", sheet.strengths],
    ["Vos progrès", sheet.progress],
    ["Commentaire", sheet.feedback],
  ] as const) {
    if (text?.trim()) lines.push("", `${heading} :`, text.trim());
  }

  if (sheet.comments.length)
    lines.push("", "Commentaires :", ...sheet.comments.map((c) => `- ${c}`));

  lines.push("", "La fiche complète, avec la grille, est en pièce jointe.", "", "À bientôt.");
  return lines.join("\n");
}
