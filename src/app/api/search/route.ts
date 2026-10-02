import { NextResponse } from "next/server";

import { groupResults, type SearchCandidate } from "@/lib/search/search";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Recherche globale : lecture seule, sous la session de Marie (RLS `owner_id = auth.uid()`). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connectée" }, { status: 401 });

  const [students, modules, resources, questions] = await Promise.all([
    supabase.from("student").select("id, first_name, last_name, scholar_group"),
    supabase.from("module").select("id, name, ycode, year"),
    supabase.from("resource").select("id, title").is("archived_at", null),
    supabase.from("question").select("id, name").is("archived_at", null),
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
      detail: [m.ycode, m.year].filter(Boolean).join(" · ") || undefined,
      terms: m.ycode ? [m.ycode] : [],
    })),
    ...(resources.data ?? []).map((r) => ({ kind: "resource" as const, id: r.id, label: r.title })),
    ...(questions.data ?? []).map((x) => ({ kind: "question" as const, id: x.id, label: x.name })),
  ];

  return NextResponse.json({ groups: groupResults(candidates, q) });
}
