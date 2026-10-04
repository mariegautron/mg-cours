import { schoolYearOf } from "@/lib/modules/list-state";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { ReuseForm } from "@/components/projects/reuse-form";
import { Button } from "@/components/ui/button";
import { getModule } from "@/lib/modules/queries";
import { getModuleProject, listReusableProjects } from "@/lib/projects/queries";
import { KEEP_ROWS, NOT_COPIED_LABELS, reusableLabel } from "@/lib/projects/reuse";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Partir d’un projet existant" };

export default async function ReuseProjectPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/project/reuse">) {
  const { id } = await params;
  const sp = await searchParams;
  const mod = await getModule(id);
  if (!mod) notFound();
  // Le module a déjà son projet : on y retourne.
  if (await getModuleProject(id)) redirect(`/modules/${id}/project`);

  const projects = await listReusableProjects(id);
  const asked = typeof sp.p === "string" ? sp.p : undefined;
  const chosen = projects.find((p) => p.id === asked) ?? projects[0] ?? null;

  let themeCount = 0;
  if (chosen) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("project_theme")
      .select("id", { count: "exact", head: true })
      .eq("project_id", chosen.id);
    themeCount = count ?? 0;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {projects.length === 0 || !chosen ? (
        <div className="bg-card max-w-xl space-y-3 rounded-3xl border border-dashed p-6">
          <h1 className="font-heading text-2xl font-bold">Partir d’un projet existant</h1>
          <p className="text-muted-foreground">
            Aucun autre projet fil rouge n’existe encore : tu peux écrire celui-ci directement.
          </p>
          <Button asChild>
            <Link href={`/modules/${mod.id}/project`}>← Revenir au projet</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
          <section
            aria-labelledby="pe"
            className="bg-card w-full min-w-0 rounded-3xl border p-5 shadow-sm lg:w-[26rem] lg:flex-none"
          >
            <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
              Évaluations
            </p>
            <h1 id="pe" className="font-heading mb-1 text-2xl font-bold">
              Partir d’un projet existant
            </h1>
            <p className="text-muted-foreground mb-2 text-sm">
              Tu gardes la structure, tu changes le sujet.
            </p>
            <ul>
              {projects.map((p) => {
                const current = p.id === chosen.id;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/modules/${mod.id}/project/reuse?p=${p.id}`}
                      aria-current={current ? "true" : undefined}
                      className="aria-[current=true]:bg-accent aria-[current=true]:border-primary/60 hover:bg-accent/60 block min-h-11 rounded-xl border border-transparent p-3"
                    >
                      <strong>{p.title}</strong>
                      <span className="text-muted-foreground block text-[0.8rem]">
                        {p.moduleName} ({schoolYearOf(p.year)})
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="text-muted-foreground mt-2.5 text-[0.8rem]">
              Les projets viennent de tes autres modules.
            </p>
            <Button asChild variant="ghost" className="mt-2">
              <Link href={`/modules/${mod.id}/project`}>← Écrire un projet de zéro</Link>
            </Button>
          </section>

          <section
            aria-labelledby="qg"
            className="bg-card w-full min-w-0 flex-1 rounded-3xl border p-5 shadow-sm lg:basis-0"
          >
            <h2 id="qg" className="font-heading mb-0.5 text-xl font-bold">
              Ce qu’on garde de {chosen.title}
            </h2>
            <p className="text-muted-foreground mb-1 text-sm">
              {reusableLabel(chosen)}. Le reste se réécrit pour le nouveau thème.
            </p>
            <ul>
              {KEEP_ROWS.map((r) => (
                <li key={r.key} className="flex min-h-14 items-center gap-3 border-t py-2">
                  <span
                    aria-hidden
                    className={`flex size-6 flex-none items-center justify-center rounded-lg border-2 ${
                      r.kept ? "bg-primary text-primary-foreground border-transparent" : ""
                    }`}
                  >
                    {r.kept ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong>{r.title}</strong>
                    <div className="text-muted-foreground text-[0.8rem]">{r.hint}</div>
                  </div>
                  <Pill tone={r.kept ? "ok" : "warn"}>{r.kept ? "Gardé" : "À réécrire"}</Pill>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-2.5 text-[0.8rem]">
              Jamais copiés :{" "}
              {NOT_COPIED_LABELS.slice(0, 4)
                .map((l) => l.replace(/^Les /, "les ").replace(/^Le /, "le "))
                .join(", ")}
              .
            </p>
          </section>

          <section
            aria-labelledby="nt"
            className="bg-card w-full min-w-0 rounded-3xl border p-5 shadow-sm lg:w-[24rem] lg:flex-none"
          >
            <h2 id="nt" className="font-heading mb-2 text-xl font-bold">
              Le nouveau thème
            </h2>
            <ReuseForm moduleId={mod.id} sourceId={chosen.id} hasThemes={themeCount > 0} />
          </section>
        </div>
      )}
    </div>
  );
}
