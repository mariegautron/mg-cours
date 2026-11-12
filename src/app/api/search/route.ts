import { NextResponse } from "next/server";

import { promotionToShow, type StudentYear } from "@/lib/students/years";
import { countPendingMakeups } from "@/lib/assessments/makeup-queries";

import {
  groupResults,
  normalize,
  screenCandidates,
  type SearchCandidate,
} from "@/lib/search/search";
import { schoolYearLabel } from "@/lib/modules/list-state";
import { nestParts, partTitle } from "@/lib/resources/parts";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Numéro de chaque séance dans son module (rang par `position`, à partir de 1). */
function sessionNumbers<C extends { id: string; module_id: string; position: number }>(
  courses: C[],
): { c: C; number: number }[] {
  const seen = new Map<string, number>();
  return [...courses]
    .sort((a, b) => a.position - b.position)
    .map((c) => {
      const number = (seen.get(c.module_id) ?? 0) + 1;
      seen.set(c.module_id, number);
      return { c, number };
    });
}

type StudentRow = {
  /** Promotion par année scolaire (`student.scholar_group`, déprécié, n'est plus lu). */
  student_year: StudentYear[] | null;
  group_member: {
    student_group: {
      name: string;
      module: { name: string; year: number; archived_at: string | null } | null;
    } | null;
  }[];
};

/** « M1 DEVFLSTK · Méthodologies Agile & Scrum · Groupe 3 » : promo, module en cours (ou le plus récent), groupe. */
function studentContext(s: unknown): string {
  const row = s as StudentRow;
  const groups = (row.group_member ?? [])
    .map((m) => m.student_group)
    .filter((g): g is NonNullable<typeof g> => !!g?.module)
    .sort(
      (a, b) =>
        Number(!!a.module!.archived_at) - Number(!!b.module!.archived_at) ||
        b.module!.year - a.module!.year,
    );
  const best = groups[0];
  const promo = promotionToShow(row.student_year ?? [])?.group;
  return [promo, best?.module?.name, best?.name].filter(Boolean).join(" · ");
}

/** Recherche globale : lecture seule, sous la session de Marie (RLS `owner_id = auth.uid()`). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  // Module ouvert à l'écran (adresse /modules/{id}/…) : ses écrans passent dans « Aller à ».
  const currentModuleId = url.searchParams.get("module");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connectée" }, { status: 401 });

  const [students, modules, resources, questions, courses, assessments, grids] = await Promise.all([
    supabase
      .from("student")
      .select(
        "id, first_name, last_name, student_year(year, scholar_group), group_member(student_group:student_group_id(name, module:module_id(name, year, archived_at)))",
      ),
    supabase.from("module").select("id, name, ycode, year, archived_at"),
    supabase.from("resource").select("id, title").is("archived_at", null),
    supabase.from("question").select("id, name, statement").is("archived_at", null),
    supabase
      .from("course")
      .select("id, title, position, module_id, module:module_id(name, archived_at)"),
    supabase.from("assessment").select("id, title, module_id, module:module_id(name, archived_at)"),
    supabase.from("grading_grid").select("id, name"),
  ]);

  // Rattrapages : calcul coûteux (un décompte par module), fait seulement si la requête peut
  // les viser (mot « rattrapage », absence excusée, ou nom d'un module).
  const nq = normalize(q);
  const wantsMakeups =
    nq.length >= 2 &&
    (["rattrapage", "absence", "excuse"].some((w) => w.startsWith(nq) || nq.includes(w)) ||
      (modules.data ?? []).some((m) => normalize(m.name).includes(nq)));
  const { data: excused } = !wantsMakeups
    ? { data: [] }
    : await supabase
        .from("grade")
        .select("assessment:assessment_id!inner(module_id)")
        .eq("attendance", "absent_excused");
  const excusedModules = new Set(
    (excused ?? []).map((g) => (g.assessment as unknown as { module_id: string }).module_id),
  );
  // Seulement les modules où un rattrapage reste à faire (même calcul que la page Rattrapages).
  const makeupModules = new Set(
    (
      await Promise.all(
        [...excusedModules].map(async (mid) => ((await countPendingMakeups(mid)) > 0 ? [mid] : [])),
      )
    ).flat(),
  );

  const currentModule = currentModuleId
    ? ((modules.data ?? []).find((m) => m.id === currentModuleId) ?? null)
    : null;

  const candidates: SearchCandidate[] = [
    ...screenCandidates(currentModule ?? undefined),
    ...(students.data ?? []).map((s) => ({
      kind: "student" as const,
      id: s.id,
      label: `${s.first_name} ${s.last_name}`,
      detail: studentContext(s) || undefined,
      terms: [`${s.last_name} ${s.first_name}`],
      fuzzy: true,
    })),
    ...(modules.data ?? []).map((m) => ({
      kind: "module" as const,
      id: m.id,
      label: m.name,
      detail: [schoolYearLabel(m.year), m.ycode, m.archived_at ? "Archivé" : null]
        .filter(Boolean)
        .join(" · "),
      terms: m.ycode ? [m.ycode] : [],
    })),
    // Espace étudiant·es : publier, partager, copier les liens (page « Espace étudiant·es » du module).
    ...(modules.data ?? [])
      .filter((m) => !m.archived_at)
      .map((m) => ({
        kind: "goto" as const,
        id: `${m.id}-espace`,
        label: `Espace étudiant·es · ${m.name}`,
        terms: ["publier", "partager", "lien", "liens", "frise", "espace étudiant"],
        href: `/modules/${m.id}/frise`,
      })),
    // Appréciations Hyperplanning : « appréciations » ouvre la liste du module.
    ...(modules.data ?? [])
      .filter((m) => !m.archived_at)
      .map((m) => ({
        kind: "appreciation" as const,
        id: m.id,
        label: "Appréciations",
        detail: m.name,
        terms: ["appréciation", "appreciations", "hyperplanning", "écrire", m.name],
        href: `/modules/${m.id}/appreciations`,
      })),
    // Rattrapages : « rattrapage » ouvre la page Rattrapages des modules qui en ont.
    ...(modules.data ?? [])
      .filter((m) => !m.archived_at && makeupModules.has(m.id))
      .map((m) => ({
        kind: "makeup" as const,
        id: `makeup-${m.id}`,
        label: `Rattrapages — ${m.name}`,
        detail: "absences excusées à rattraper",
        terms: ["rattrapage", "rattrapages", "absence excusée", "excusé", m.name],
        href: `/modules/${m.id}/rattrapages`,
      })),
    // Morceaux « Cours — partie » : rangés sous leur cours (« 19 parties »), trouvables par leur nom.
    ...nestParts(resources.data ?? []).map(({ item: r, parts }) => ({
      kind: "resource" as const,
      id: r.id,
      label: r.title,
      detail: parts.length ? `${parts.length} partie${parts.length > 1 ? "s" : ""}` : undefined,
      terms: parts.map((p) => partTitle(p.title)?.part ?? p.title),
    })),
    // Séances : par titre ou par numéro (« séance 5 »), ouvertes sur « Avant de commencer ».
    ...sessionNumbers(courses.data ?? [])
      .filter(({ c }) => !(c.module as { archived_at: string | null } | null)?.archived_at)
      .map(({ c, number }) => ({
        kind: "course" as const,
        id: c.id,
        label: c.title,
        detail: `${(c.module as { name: string } | null)?.name ?? ""} · Séance ${number}`,
        terms: [`séance ${number}`, `seance ${number}`],
        href: `/modules/${c.module_id}/courses/${c.id}/start`,
      })),
    // Évaluations : par titre ou module, ou « corriger » ; ouvertes sur leur page (jamais sur la correction).
    ...(assessments.data ?? [])
      .filter((a) => !(a.module as { archived_at: string | null } | null)?.archived_at)
      .map((a) => ({
        kind: "assessment" as const,
        id: a.id,
        label: a.title,
        detail: (a.module as { name: string } | null)?.name ?? undefined,
        terms: [
          a.title,
          "corriger",
          "évaluation",
          (a.module as { name: string } | null)?.name ?? "",
        ],
        href: `/modules/${a.module_id}/assessments/${a.id}`,
      })),
    // Grilles de correction : ouvertes sur leur éditeur.
    ...(grids.data ?? []).map((g) => ({
      kind: "grid" as const,
      id: g.id,
      label: g.name,
      detail: "Grille de correction",
      terms: ["grille", "grilles", "critères"],
      href: `/assessments/grids/${g.id}/edit`,
    })),
    // Questions : le début de l'énoncé en titre, le code dessous.
    ...(questions.data ?? []).map((x) => {
      const statement = x.statement
        .replace(/[#*_`>]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return {
        kind: "question" as const,
        id: x.id,
        label: statement
          ? statement.length > 80
            ? `${statement.slice(0, 79)}…`
            : statement
          : x.name,
        detail: x.name,
        terms: [x.name],
      };
    }),
  ];

  return NextResponse.json({ groups: groupResults(candidates, q) });
}
