import { normalizeSearch } from "@/lib/resources/search";

/**
 * US-77 : import vers les groupes d'un module. La colonne « groupe » du fichier est soit la
 * promotion (comportement historique, US-80b), soit le nom d'un groupe du module ; une option
 * ajoute en plus tout le monde à un même groupe. Fonctions pures.
 */

export type GroupColumnMode = "promotion" | "module_group";

export interface GroupImportOptions {
  mode: GroupColumnMode;
  /** Nom du groupe où ajouter toutes les personnes importées ; vide = pas d'ajout global. */
  allGroupName: string;
}

export interface GroupImportRow {
  rowNumber: number;
  scholarGroup: string | null;
}

export interface GroupImportPlan {
  /** Appartenances à créer : ligne du fichier → groupe (nom canonique). */
  memberships: { rowNumber: number; groupName: string }[];
  /** Un résumé par groupe touché, dans l'ordre d'apparition. */
  groups: { name: string; isNew: boolean; count: number }[];
}

export function readGroupMode(value: unknown): GroupColumnMode {
  return value === "module_group" ? "module_group" : "promotion";
}

/**
 * Calcule les appartenances : un groupe existant du module est reconnu sans tenir compte de la
 * casse, des accents ni des espaces multiples (« tp  1 » = « TP 1 »). Une personne n'apparaît
 * qu'une fois par groupe.
 */
export function planGroupImport(
  rows: GroupImportRow[],
  options: GroupImportOptions,
  existing: { name: string }[],
): GroupImportPlan {
  const canonical = new Map<string, string>(existing.map((g) => [normalizeSearch(g.name), g.name]));
  const existingKeys = new Set(canonical.keys());
  const summary = new Map<string, { name: string; isNew: boolean; count: number }>();
  const seen = new Set<string>();
  const memberships: GroupImportPlan["memberships"] = [];

  const add = (rowNumber: number, rawName: string) => {
    const name = rawName.trim().replace(/\s+/g, " ");
    const key = normalizeSearch(name);
    if (!key) return;
    if (!canonical.has(key)) canonical.set(key, name);
    const groupName = canonical.get(key)!;
    if (seen.has(`${rowNumber}|${key}`)) return;
    seen.add(`${rowNumber}|${key}`);
    memberships.push({ rowNumber, groupName });
    const entry = summary.get(key) ?? { name: groupName, isNew: !existingKeys.has(key), count: 0 };
    entry.count++;
    summary.set(key, entry);
  };

  for (const row of rows) {
    if (options.mode === "module_group" && row.scholarGroup) add(row.rowNumber, row.scholarGroup);
    if (options.allGroupName.trim()) add(row.rowNumber, options.allGroupName);
  }
  return { memberships, groups: [...summary.values()] };
}

/** Promotion à enregistrer pour une ligne : la colonne « groupe » n'en est une qu'en mode promotion. */
export function promotionOf(row: { scholarGroup: string | null }, mode: GroupColumnMode) {
  return mode === "promotion" ? row.scholarGroup : null;
}

/** « 2 groupes à créer (TP1, TP2), 1 existant (TD1) ; 25 appartenances. » */
export function describeGroupPlan(plan: GroupImportPlan): string {
  if (plan.groups.length === 0) return "Aucun ajout à un groupe du module.";
  const created = plan.groups.filter((g) => g.isNew);
  const existing = plan.groups.filter((g) => !g.isNew);
  const parts: string[] = [];
  if (created.length) {
    parts.push(
      `${created.length} groupe${created.length > 1 ? "s" : ""} à créer (${created.map((g) => g.name).join(", ")})`,
    );
  }
  if (existing.length) {
    parts.push(
      `${existing.length} existant${existing.length > 1 ? "s" : ""} (${existing.map((g) => g.name).join(", ")})`,
    );
  }
  const total = plan.memberships.length;
  return `${parts.join(", ")} ; ${total} appartenance${total > 1 ? "s" : ""}.`;
}

export interface SearchableStudent {
  first_name: string;
  last_name: string;
  email: string | null;
  student_number: string | null;
}

/** Recherche d'étudiant·es (nom, prénom dans les deux ordres, e-mail, numéro) : tous les mots doivent correspondre. */
export function filterStudents<T extends SearchableStudent>(students: T[], query: string): T[] {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  if (terms.length === 0) return students;
  return students.filter((s) => {
    const haystack = normalizeSearch(
      `${s.first_name} ${s.last_name} ${s.last_name} ${s.first_name} ${s.email ?? ""} ${s.student_number ?? ""}`,
    );
    return terms.every((t) => haystack.includes(t));
  });
}
