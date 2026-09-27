/**
 * Carnet de séance (US-65 observations, US-67 clôture) — logique pure. Données privées :
 * jamais projetées, exportées en PDF ni envoyées par e-mail (cf. privacy.test.ts).
 */
import { z } from "zod";

import type { Enums } from "@/types/db";

export type ObservationTag = Enums<"observation_tag">;
export type CourseCompletion = Enums<"course_completion">;

export const OBSERVATION_TAGS = [
  { value: "relevant_question", label: "Question pertinente" },
  { value: "participation", label: "Participation" },
  { value: "difficulty", label: "Difficulté" },
  { value: "absent_late", label: "Absent·e ou retard" },
  { value: "other", label: "Autre" },
] as const satisfies readonly { value: ObservationTag; label: string }[];

export const OBSERVATION_TAG_LABELS = Object.fromEntries(
  OBSERVATION_TAGS.map((t) => [t.value, t.label]),
) as Record<ObservationTag, string>;

export const COMPLETION_OPTIONS = [
  { value: "done", label: "Faite" },
  { value: "partial", label: "Partiellement faite" },
  { value: "not_done", label: "Non faite" },
] as const satisfies readonly { value: CourseCompletion; label: string }[];

export const COMPLETION_LABELS = Object.fromEntries(
  COMPLETION_OPTIONS.map((c) => [c.value, c.label]),
) as Record<CourseCompletion, string>;

const TAG_VALUES = OBSERVATION_TAGS.map((t) => t.value) as [ObservationTag, ...ObservationTag[]];
const COMPLETION_VALUES = COMPLETION_OPTIONS.map((c) => c.value) as [
  CourseCompletion,
  ...CourseCompletion[],
];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .transform((v) => v || null);

export const observationSchema = z.object({
  studentId: z.uuid("Étudiant·e invalide."),
  tag: z.enum(TAG_VALUES, "Choisissez une étiquette."),
  note: optionalText(1000),
});

export function readObservationForm(formData: FormData) {
  return observationSchema.safeParse({
    studentId: formData.get("studentId") ?? "",
    tag: formData.get("tag") ?? "",
    note: formData.get("note") ?? "",
  });
}

export const closureSchema = z.object({
  completion: z.enum(COMPLETION_VALUES).nullable(),
  notCovered: optionalText(4000),
  nextTime: optionalText(4000),
  retroNote: optionalText(4000),
});

export function readClosureForm(formData: FormData) {
  const completion = formData.get("completion");
  return closureSchema.safeParse({
    completion: completion ? completion : null,
    notCovered: formData.get("notCovered") ?? "",
    nextTime: formData.get("nextTime") ?? "",
    retroNote: formData.get("retroNote") ?? "",
  });
}

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

interface NamedStudent {
  id: string;
  first_name: string;
  last_name: string;
}

/**
 * Étudiant·es des groupes d'un module, sans doublon, triés par nom puis prénom, filtrés par
 * `query` (prénom ou nom, insensible à la casse et aux accents).
 */
export function notebookStudents<S extends NamedStudent>(
  groups: { members: S[] }[],
  query = "",
): S[] {
  const byId = new Map<string, S>();
  for (const g of groups) for (const m of g.members) if (!byId.has(m.id)) byId.set(m.id, m);
  const words = fold(query).split(/\s+/).filter(Boolean);
  return [...byId.values()]
    .filter((s) => {
      const name = fold(`${s.first_name} ${s.last_name}`);
      return words.every((w) => name.includes(w));
    })
    .sort(
      (a, b) =>
        a.last_name.localeCompare(b.last_name, "fr") ||
        a.first_name.localeCompare(b.first_name, "fr"),
    );
}
