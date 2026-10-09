import { renderToBuffer } from "@react-pdf/renderer";
import { createClient as mk } from "@supabase/supabase-js";
import { it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sb = mk(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => sb }));

import { appendFileSync } from "node:fs";
const log = (...a: unknown[]) =>
  appendFileSync(
    "/tmp/claude-1001/-home-wilson-Bureau-mg-cours/b9d51441-6207-49f9-b854-7f2e2229be83/scratchpad/repro.log",
    a.join(" ") + "\n",
  );
it("repro", async () => {
  const { toExportCourses } = await import("@/lib/modules/course-export");
  const { loadResourceImages } = await import("@/lib/pdf/images");
  const { CourseDocument } = await import("@/lib/pdf/courses");
  const { data } = await sb
    .from("course")
    .select(
      "title, position, session_date, learning_objectives, material, course_resource(role, resource:resource_id(id, files, updated_at, title, description, content, url, audience, status))",
    )
    .eq("module_id", "fd123544-d4d7-45d7-8ae4-343310cf5ef8")
    .order("position");
  const courses = toExportCourses(data as any);
  const imgs = await loadResourceImages(courses.flatMap((c) => c.resources));
  log("images chargées pour", imgs.size, "fiches");
  for (const c of courses)
    for (const r of c.resources) (r as any).images = (r.id && imgs.get(r.id)) || undefined;
  const mod: any = {
    name: "M",
    ycode: null,
    schoolName: null,
    level: "M1",
    year: 2026,
    schoolYear: "2026-2027",
    teacherName: "T",
  };
  const c = courses[0];
  const tryIt = async (label: string, course: any) => {
    try {
      await renderToBuffer(CourseDocument({ mod, course }));
      log("OK", label);
    } catch (e) {
      log("ECHEC", label, String(e).slice(0, 60));
    }
  };
  await tryIt("S1 complet", c);
  await tryIt("S1 sans images", {
    ...c,
    resources: c.resources.map((r: any) => ({ ...r, images: undefined })),
  });
  for (let n = 1; n <= c.resources.length; n++)
    await tryIt("S1 prefixe " + n + " (" + c.resources[n - 1].title + ")", {
      ...c,
      resources: c.resources.slice(0, n),
    });
}, 280000);
