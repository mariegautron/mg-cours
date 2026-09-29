/**
 * Squelette d'un projet fil rouge (US-88).
 *
 * Règle de comptage : 1 note individuelle + 1 note d'oral + autant de jalons que de notes YNOV
 * restantes (`requiredNotes(...).total - 2`, jamais négatif). Les notes de groupe sont remplies
 * d'abord (jalons de groupe + oral), puis les individuelles (jalons individuels + évaluation
 * individuelle). Chaque jalon reste une évaluation ordinaire : le compteur X/Y n'a rien de particulier.
 */

import { requiredNotes } from "./notation";

export type ProjectRole = "milestone" | "oral" | "individual";

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  milestone: "Jalon",
  oral: "Oral de fin de projet",
  individual: "Évaluation individuelle",
};

export interface SkeletonItem {
  role: ProjectRole;
  title: string;
  isGroupGrade: boolean;
}

/** Squelette proposé pour un volume horaire ; vide si le volume n'est pas renseigné. */
export function projectSkeleton(totalHours: number): SkeletonItem[] {
  const req = requiredNotes(totalHours);
  if (req.total === 0) return [];

  const milestones = Math.max(0, req.total - 2);
  // Le groupe compte déjà l'oral ; le reste des notes de groupe devient des jalons de groupe.
  const groupMilestones = Math.min(milestones, Math.max(0, req.group - 1));
  const items: SkeletonItem[] = [];
  for (let i = 1; i <= milestones; i++) {
    items.push({ role: "milestone", title: `Jalon ${i}`, isGroupGrade: i <= groupMilestones });
  }
  items.push({ role: "oral", title: "Oral de fin de projet", isGroupGrade: true });
  items.push({ role: "individual", title: "Évaluation individuelle", isGroupGrade: false });
  return items;
}

/**
 * Éléments du squelette qui restent à créer : pour chaque rôle, on retire ce qui existe déjà
 * (les jalons existants comptent d'abord, dans l'ordre du squelette).
 */
export function remainingSkeleton(
  skeleton: readonly SkeletonItem[],
  existing: readonly ProjectRole[],
): SkeletonItem[] {
  const left: Record<ProjectRole, number> = { milestone: 0, oral: 0, individual: 0 };
  for (const role of existing) left[role]++;
  return skeleton.filter((item) => {
    if (left[item.role] > 0) {
      left[item.role]--;
      return false;
    }
    return true;
  });
}

export interface SkeletonBalance {
  required: { total: number; group: number; individual: number };
  proposed: { total: number; group: number; individual: number };
  /** Vrai si le total proposé atteint exactement le nombre de notes exigées. */
  matches: boolean;
  /** Message prêt à afficher (français), `null` quand tout est juste. */
  message: string | null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Compare les évaluations du projet (existantes + proposées) aux notes exigées, pour garder
 * le compteur X/Y juste pendant que Marie modifie le squelette.
 */
export function skeletonBalance(
  totalHours: number,
  items: readonly Pick<SkeletonItem, "isGroupGrade">[],
): SkeletonBalance {
  const req = requiredNotes(totalHours);
  const group = items.filter((i) => i.isGroupGrade).length;
  const individual = items.length - group;
  const required = { total: req.total, group: req.group, individual: req.individual };
  const proposed = { total: items.length, group, individual };

  let message: string | null = null;
  if (req.total === 0) {
    message = "Volume horaire du module non renseigné : le nombre de notes exigées est inconnu.";
  } else if (items.length < req.total) {
    message = `Il manque ${plural(req.total - items.length, "évaluation", "évaluations")} pour atteindre les ${req.total} notes YNOV exigées.`;
  } else if (items.length > req.total) {
    message = `${plural(items.length - req.total, "évaluation en plus", "évaluations en plus")} : ${req.total} notes YNOV sont exigées.`;
  } else if (group < req.group || individual < req.individual) {
    message = `Répartition inhabituelle : ${req.group} note${req.group > 1 ? "s" : ""} de groupe et ${req.individual} individuelle${req.individual > 1 ? "s" : ""} sont exigées.`;
  }

  return { required, proposed, matches: items.length === req.total, message };
}
