import { zipSync, strToU8 } from "fflate";

import { README, toCsv } from "@/lib/export/csv";
import { deliverExport } from "@/lib/pdf/export-delivery";
import { createClient } from "@/lib/supabase/server";
import { readGradingRules } from "@/lib/settings/school-rules";
import { appliedCoefficient } from "@/lib/ynov/notation";
import type { Database } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

type TableName = keyof Database["public"]["Tables"];

/**
 * Toutes les tables de Marie (RLS : seulement les siennes). Une table ajoutée à la base doit
 * entrer ici, ou dans EXCLUDED avec sa raison.
 */
const TABLES = [
  "teacher_profile",
  "school",
  "school_setting",
  "module",
  "module_document",
  "module_expectation",
  "module_project",
  "module_resource",
  "module_retrospective",
  "module_feedback",
  "pedagogical_outline",
  "course",
  "course_plan",
  "course_resource",
  "course_expectation",
  "expectation_resource",
  "expectation_dismissal",
  "resource",
  "resource_version",
  "resource_question",
  "question",
  "question_choice",
  "student",
  "student_year",
  "student_group",
  "group_member",
  "assessment",
  "assessment_expectation",
  "assessment_group",
  "assessment_student",
  "grade",
  "group_grade_member",
  "grading_grid",
  "grid_axis",
  "grid_criterion",
  "criterion_level",
  "predefined_comment",
  "appreciation",
  "appreciation_phrase",
  "submission_item",
  "project_surprise",
  "project_theme",
  "project_theme_assignment",
  "open_review",
  "oral_slot",
  "oral_space",
  "quiz",
  "quiz_pool",
  "quiz_draw_rule",
  "quiz_question_criterion",
  "quiz_attempt",
  "invoice",
  "invoice_tracking",
] as const satisfies readonly TableName[];

/**
 * Hors export : jetons d'accès (même hachés) et traces techniques sans valeur pour Marie :
 * module_share_link, module_student_link, module_feedback_link, result_link, quiz_class_link,
 * quiz_claim, quiz_ip_failure, projection_event, import_ref. Le carnet d'observations
 * ne sort jamais de l'appli (garde-fou du carnet de séance).
 */

const PAGE = 1000;

type Row = Record<string, unknown>;

/**
 * Export .zip des données de la personne connectée : tableurs, JSON complet, LISEZ-MOI. Les fichiers
 * (rendus, photos…) passent par « Exporter mes fichiers » : le navigateur les télécharge lui-même
 * (télécharger tout le stockage ici dépassait le délai d'une fonction Vercel : 502 après 1 min 40).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Non connectée", { status: 401 });

  const data: Record<string, Row[]> = {};
  await Promise.all(
    TABLES.map(async (t) => {
      const rows: Row[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data: page, error } = await supabase
          .from(t)
          .select("*")
          .range(from, from + PAGE - 1);
        if (error || !page) break;
        rows.push(...(page as Row[]));
        if (page.length < PAGE) break;
      }
      data[t] = rows;
    }),
  );

  const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const byId = (t: string) => new Map((data[t] ?? []).map((r) => [str(r.id), r]));
  const modules = byId("module");
  const students = byId("student");
  const assessments = byId("assessment");
  const groups = byId("student_group");
  const studentName = (id: unknown) => {
    const s = students.get(str(id));
    return s ? `${str(s.first_name)} ${str(s.last_name)}` : "";
  };
  const moduleName = (id: unknown) => str(modules.get(str(id))?.name);
  // Coefficient appliqué (imposé par l'école, sinon règle de l'école du module) : jamais
  // `assessment.coefficient`, qui n'est plus tenu à jour.
  const settingsBySchool = new Map(
    (data["school_setting"] ?? []).map((r) => [str(r.school_id), r]),
  );
  const appliedCoef = (a: Row | undefined) => {
    if (!a) return null;
    const schoolId = str(modules.get(str(a.module_id))?.school_id);
    const rules = readGradingRules(
      (settingsBySchool.get(schoolId) ?? null) as Parameters<typeof readGradingRules>[0],
    );
    const override = a.coefficient_override == null ? null : Number(a.coefficient_override);
    return appliedCoefficient(a.is_group_grade === true, override, rules);
  };
  const yearOf = (id: unknown) => {
    const y = Number(modules.get(str(id))?.year);
    return Number.isFinite(y) && y > 0 ? `${y}-${y + 1}` : "";
  };
  const num = (v: unknown) => (typeof v === "number" ? v : null);

  const files: Record<string, Uint8Array> = {};
  const today = new Date().toISOString().slice(0, 10);

  // Tableurs.
  files["tableurs/etudiant-es.csv"] = strToU8(
    toCsv(
      ["Nom", "Prénom", "E-mail", "Numéro étudiant", "Promotions"],
      (data.student ?? []).map((s) => [
        str(s.last_name),
        str(s.first_name),
        str(s.email),
        str(s.student_number),
        (data.student_year ?? [])
          .filter((y) => y.student_id === s.id && y.scholar_group)
          .map((y) => `${str(y.year)} : ${str(y.scholar_group)}`)
          .join(" · "),
      ]),
    ),
  );
  files["tableurs/modules.csv"] = strToU8(
    toCsv(
      ["Module", "Année", "Code", "Heures", "Début", "Fin", "Archivé le"],
      (data.module ?? []).map((m) => [
        str(m.name),
        yearOf(m.id),
        str(m.ycode),
        num(m.total_hours),
        str(m.start_date),
        str(m.end_date),
        str(m.archived_at).slice(0, 10),
      ]),
    ),
  );
  files["tableurs/seances.csv"] = strToU8(
    toCsv(
      ["Module", "Année", "N°", "Séance", "Date", "Début", "Fin", "Préparation"],
      [...(data.course ?? [])]
        .sort(
          (a, b) =>
            moduleName(a.module_id).localeCompare(moduleName(b.module_id), "fr") ||
            Number(a.position) - Number(b.position),
        )
        .map((c) => [
          moduleName(c.module_id),
          yearOf(c.module_id),
          num(c.position),
          str(c.title),
          str(c.session_date),
          str(c.start_time),
          str(c.end_time),
          str(c.prep_status),
        ]),
    ),
  );
  // Notes : une ligne par étudiant·e et évaluation (les notes de groupe pour chaque membre).
  const membersOf = (groupId: unknown) =>
    (data.group_member ?? [])
      .filter((m) => m.student_group_id === groupId)
      .map((m) => m.student_id);
  const gradeRows = (data.grade ?? []).flatMap((g) => {
    const a = assessments.get(str(g.assessment_id));
    const who = g.student_id ? [g.student_id] : membersOf(g.student_group_id);
    return who.map((sid) => ({ g, a, sid }));
  });
  files["tableurs/notes.csv"] = strToU8(
    toCsv(
      [
        "Étudiant·e",
        "Module",
        "Année",
        "Évaluation",
        "Groupe",
        "Coefficient",
        "Note",
        "Sur",
        "Points forts",
        "Axes de progrès",
        "Commentaire",
      ],
      gradeRows.map(({ g, a, sid }) => [
        studentName(sid),
        moduleName(a?.module_id),
        yearOf(a?.module_id),
        str(a?.title),
        str(groups.get(str(g.student_group_id))?.name),
        num(appliedCoef(a)),
        num(g.value),
        num(a?.max_score) ?? 20,
        str(g.strengths),
        str(g.progress),
        str(g.feedback),
      ]),
    ),
  );
  files["tableurs/presences.csv"] = strToU8(
    toCsv(
      ["Étudiant·e", "Module", "Évaluation", "Date", "Présence"],
      gradeRows.map(({ g, a, sid }) => [
        studentName(sid),
        moduleName(a?.module_id),
        str(a?.title),
        str(a?.date),
        g.attendance === "absent_excused"
          ? "Absence excusée"
          : g.attendance === "absent_unexcused"
            ? "Absence non prévenue"
            : "Présent·e",
      ]),
    ),
  );
  files["tableurs/appreciations.csv"] = strToU8(
    toCsv(
      ["Étudiant·e", "Module", "Année", "Appréciation", "Reportée dans Hyperplanning"],
      (data.appreciation ?? []).map((a) => [
        studentName(a.student_id),
        moduleName(a.module_id),
        yearOf(a.module_id),
        str(a.text),
        str(a.reported_text) ? "oui" : "non",
      ]),
    ),
  );
  files["donnees-completes.json"] = strToU8(
    JSON.stringify({ exported_at: new Date().toISOString(), ...data }, null, 2),
  );
  files["LISEZ-MOI.txt"] = strToU8(README(today, []));

  const zip = zipSync(files, { level: 6 });
  // Plus de 4 Mo : déposé dans le stockage privé, le bouton suit une URL signée courte.
  return deliverExport({
    bytes: zip,
    contentType: "application/zip",
    filename: `marelle-mes-donnees-${today}.zip`,
    moduleId: "compte",
    kind: "mes-donnees",
  });
}
