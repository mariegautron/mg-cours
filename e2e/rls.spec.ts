import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

// Isolation des données (RLS) : un second compte ne voit ni ne modifie rien de celles de Marie.
// Nécessite Supabase local (clés de démo, valides uniquement en localhost).
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const MARIE_ID = "11111111-1111-1111-1111-111111111111";
const SEED_MODULE_ID = "33333333-3333-3333-3333-000000000001";

const TABLES = [
  "teacher_profile",
  "school",
  "resource",
  "module",
  "course",
  "course_resource",
  "student",
  "student_group",
  "group_member",
  "grading_grid",
  "grid_criterion",
  "predefined_comment",
  "assessment",
  "grade",
  "pedagogical_outline",
  "invoice",
] as const;

test("un second compte ne voit ni ne modifie les données de Marie (RLS)", async () => {
  const marie = createClient(URL, ANON);
  const login = await marie.auth.signInWithPassword({
    email: "marie@local.test",
    password: "password123",
  });
  expect(login.error).toBeNull();
  const seen = await marie.from("module").select("id").eq("id", SEED_MODULE_ID);
  expect(seen.data).toHaveLength(1); // témoin : Marie voit bien son module

  const other = createClient(URL, ANON);
  const signUp = await other.auth.signUp({
    email: `intrus-${Date.now()}@example.test`,
    password: "un-mot-de-passe-solide-42",
  });
  expect(signUp.error).toBeNull();
  expect(signUp.data.session).not.toBeNull(); // sinon confirmation d'e-mail requise en local

  // Lecture : zéro ligne, sur les 16 tables.
  for (const table of TABLES) {
    const { data, error } = await other.from(table).select("id");
    expect(error, table).toBeNull();
    expect(data, `lecture ${table}`).toEqual([]);
  }

  // Écriture : modifier/supprimer les données de Marie n'a aucun effet.
  await other.from("module").update({ name: "piraté" }).eq("id", SEED_MODULE_ID);
  await other.from("module").delete().eq("id", SEED_MODULE_ID);
  const still = await marie.from("module").select("name").eq("id", SEED_MODULE_ID).single();
  expect(still.data?.name).toBe("Méthodologies Agile & Scrum");

  // Insertion au nom de Marie : refusée par la politique WITH CHECK.
  const forged = await other.from("resource").insert({ title: "intrus", owner_id: MARIE_ID });
  expect(forged.error).not.toBeNull();

  // Sans session : aucune donnée non plus.
  const anon = createClient(URL, ANON);
  for (const table of TABLES) {
    const { data } = await anon.from(table).select("id");
    expect(data ?? [], `anonyme ${table}`).toEqual([]);
  }
});
