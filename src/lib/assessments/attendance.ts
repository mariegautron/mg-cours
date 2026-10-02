export const ATTENDANCE_VALUES = ["present", "absent_unexcused", "absent_excused"] as const;
export type Attendance = (typeof ATTENDANCE_VALUES)[number];

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  present: "Présent·e",
  absent_unexcused: "Absent·e non prévenu·e",
  absent_excused: "Absent·e excusé·e",
};

export const ATTENDANCE_HINTS: Record<Attendance, string> = {
  present: "",
  absent_unexcused: "Note 0 automatique (règle de l’école).",
  absent_excused: "Pas de note, non comptée dans la moyenne ; rattrapage à prévoir.",
};

export function isAttendance(value: unknown): value is Attendance {
  return typeof value === "string" && (ATTENDANCE_VALUES as readonly string[]).includes(value);
}

/**
 * Situation d'un·e membre dans une note de groupe : présence, et un mot facultatif pour la personne
 * (`justification`, lu par elle, sans effet sur la note). `factor` n'est plus qu'une trace des
 * anciennes pondérations : il est ignoré, on ne retire jamais de points à une personne.
 */
export interface MemberOverride {
  attendance: Attendance;
  /** Hérité : toujours 1 à l'écriture, ignoré à la lecture. */
  factor: number;
  /** « Un mot pour la personne » : facultatif, affiché dans son résultat, sans effet sur la note. */
  justification: string | null;
}

export const DEFAULT_OVERRIDE: MemberOverride = {
  attendance: "present",
  factor: 1,
  justification: null,
};

/** `true` si rien n'est à retenir : aucune ligne à enregistrer pour ce membre. */
export function isDefaultOverride(o: MemberOverride): boolean {
  return o.attendance === "present" && !o.justification;
}

/** Ce que devient une absence excusée sur une note de groupe, d'après la règle de l'école. */
export function excusedGroupHint(rule: "keep_group_grade" | "makeup"): string {
  return rule === "keep_group_grade"
    ? "Garde la note du groupe (règle de l’école)."
    : "Pas de note, non comptée dans la moyenne ; rattrapage individuel à prévoir (règle de l’école).";
}

/**
 * Note individuelle selon la présence : absent·e non prévenu·e = 0 automatique, absent·e excusé·e = pas
 * de note (hors moyenne tant qu'elle n'est pas remplacée par un rattrapage), présent·e = la note saisie.
 */
export function individualValueFor(attendance: Attendance, value: number | null): number | null {
  if (attendance === "absent_unexcused") return 0;
  if (attendance === "absent_excused") return null;
  return value;
}

/**
 * Note finale d'un·e membre pour une note de groupe (US-142) :
 * - absent·e non prévenu·e : 0, quoi que dise l'école ;
 * - absent·e excusé·e : selon la règle de l'école, il ou elle garde la note du groupe
 *   (`keep_group_grade`, par défaut) ou n'a pas de note, en attente d'un rattrapage (`makeup`) ;
 * - présent·e : la note du groupe.
 * Jamais de retrait de points. Le résultat est plafonné au barème.
 */
export function groupMemberValue(
  groupValue: number | null,
  maxScore: number,
  override?: Pick<MemberOverride, "attendance"> | null,
  rule: "keep_group_grade" | "makeup" = "keep_group_grade",
): number | null {
  if (override?.attendance === "absent_unexcused") return 0;
  if (override?.attendance === "absent_excused" && rule === "makeup") return null;
  if (groupValue === null) return null;
  return Math.min(groupValue, maxScore);
}

/**
 * Lit la situation de chaque membre d'une note de groupe : `member_<id>_attendance` et
 * `member_<id>_justification` (le mot pour la personne, facultatif). Seuls les membres du groupe
 * (`members`) sont lus ; les membres sans particularité sont omis. Aucune pondération n'est lue.
 */
export function readMemberOverrides(
  formData: FormData,
  members: readonly { id: string; name: string }[],
): { overrides: Map<string, MemberOverride> } | { error: string } {
  const overrides = new Map<string, MemberOverride>();
  for (const member of members) {
    const rawAttendance = formData.get(`member_${member.id}_attendance`);
    const attendance = isAttendance(rawAttendance) ? rawAttendance : "present";
    const justification =
      String(formData.get(`member_${member.id}_justification`) ?? "")
        .trim()
        .slice(0, 1000) || null;
    const override: MemberOverride = { attendance, factor: 1, justification };
    if (!isDefaultOverride(override)) overrides.set(member.id, override);
  }
  return { overrides };
}
