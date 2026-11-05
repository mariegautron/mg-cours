import { NextResponse } from "next/server";

import { groupResults, type SearchCandidate } from "@/lib/search/search";
import { schoolYearLabel } from "@/lib/modules/list-state";
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

/** Recherche globale : lecture seule, sous la session de Marie (RLS `owner_id = auth.uid()`). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connectée" }, { status: 401 });

  const [students, modules, resources, questions, courses, assessments] = await Promise.all([
    supabase.from("student").select("id, first_name, last_name, scholar_group"),
    supabase.from("module").select("id, name, ycode, year"),
    supabase.from("resource").select("id, title").is("archived_at", null),
    supabase.from("question").select("id, name").is("archived_at", null),
    supabase
      .from("course")
      .select("id, title, position, module_id, module:module_id(name, archived_at)"),
    supabase.from("assessment").select("id, title, module_id, module:module_id(name, archived_at)"),
  ]);

  const candidates: SearchCandidate[] = [
    ...(students.data ?? []).map((s) => ({
      kind: "student" as const,
      id: s.id,
      label: `${s.first_name} ${s.last_name}`,
      detail: s.scholar_group ?? undefined,
      terms: [`${s.last_name} ${s.first_name}`],
    })),
    ...(modules.data ?? []).map((m) => ({
      kind: "module" as const,
      id: m.id,
      label: m.name,
      detail: [schoolYearLabel(m.year), m.ycode].filter(Boolean).join(" · "),
      terms: m.ycode ? [m.ycode] : [],
    })),
    ...(resources.data ?? []).map((r) => ({ kind: "resource" as const, id: r.id, label: r.title })),
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
    // Évaluations : par titre ou module, ou « corriger » ; ouvertes directement sur la correction.
    ...(assessments.data ?? [])
      .filter((a) => !(a.module as { archived_at: string | null } | null)?.archived_at)
      .map((a) => ({
        kind: "assessment" as const,
        id: a.id,
        label: `Corriger ${a.title}`,
        detail: (a.module as { name: string } | null)?.name ?? undefined,
        terms: [
          a.title,
          "corriger",
          "évaluation",
          (a.module as { name: string } | null)?.name ?? "",
        ],
        href: `/modules/${a.module_id}/assessments/${a.id}/correct`,
      })),
    ...(questions.data ?? []).map((x) => ({ kind: "question" as const, id: x.id, label: x.name })),
  ];

  return NextResponse.json({ groups: groupResults(candidates, q) });
}
