import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  buildForExpectation,
  dismissMatch,
  retainForModule,
  setExpectationCourses,
  unretainForModule,
} from "@/app/(app)/modules/[id]/matching/actions";
import { Pill } from "@/components/dashboard/pill";
import { MatchingForm } from "@/components/modules/matching-form";
import { AddExpectationForm } from "@/components/modules/add-expectation-form";
import { KindBadge, StatusBadge } from "@/components/resources/resource-badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUSTOM_ORIGIN_LABEL, isCustomExpectation } from "@/lib/modules/custom-expectations";
import {
  coverageState,
  formatCoverage,
  MATCH_LEVEL_LABELS,
  matchResources,
  summarizeCoverage,
  type CoverageState,
  type MatchLevel,
} from "@/lib/modules/matching";
import {
  coverageSegments,
  filterByState,
  filterCounts,
  MATCHING_FILTERS,
  parseMatchingFilter,
  selectedExpectationId,
  type MatchingFilter,
} from "@/lib/modules/matching-view";
import { excerptForTerms, SEARCH_FIELD_LABELS } from "@/lib/resources/search";
import { createClient } from "@/lib/supabase/server";
import { getExpectationCourses, listCandidateResources } from "@/lib/modules/matching-queries";
import {
  getModule,
  getModuleCourses,
  getModuleExpectations,
  getRetainedResources,
} from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Rapprochement" };

const PREVIEW_LENGTH = 1500;

const STATE_LABELS: Record<CoverageState, string> = {
  covered: "Fait",
  to_build: "À voir",
  uncovered: "Rien",
};

const STATE_TONES = { covered: "ok", to_build: "warn", uncovered: "plain" } as const;
const LEVEL_TONES: Record<MatchLevel, "ok" | "warn" | "plain"> = {
  strong: "ok",
  medium: "warn",
  weak: "plain",
};

export default async function MatchingPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/matching">) {
  const { id } = await params;
  const sp = await searchParams;
  const asked = typeof sp.e === "string" ? sp.e : undefined;
  const filter = parseMatchingFilter(typeof sp.f === "string" ? sp.f : undefined);

  const [mod, expectations, courses, retained, candidates, coursesByExpectation] =
    await Promise.all([
      getModule(id),
      getModuleExpectations(id),
      getModuleCourses(id),
      getRetainedResources(id),
      listCandidateResources(),
      getExpectationCourses(id),
    ]);
  if (!mod) notFound();
  // Ressources écartées par « Ce n'est pas la bonne » (table facultative : sans elle, rien n'est écarté).
  const dismissed = new Map<string, Set<string>>();
  {
    const supabase = await createClient();
    const { data } = await supabase
      .from("expectation_dismissal")
      .select("expectation_id, resource_id")
      .eq("module_id", id);
    for (const d of data ?? []) {
      dismissed.set(
        d.expectation_id,
        (dismissed.get(d.expectation_id) ?? new Set()).add(d.resource_id),
      );
    }
  }

  const retainedIds = new Set(retained.map((r) => r.id));
  const rows = expectations.map((e) => {
    // La couverture compte toutes les ressources retenues qui correspondent, pas seulement les
    // cinq premières proposées ; l'affichage garde les cinq premières et les ressources retenues.
    const all = matchResources(e.label, candidates, candidates.length, { excerpts: false });
    const courseIds = coursesByExpectation.get(e.id) ?? [];
    const state = coverageState({
      courseIds,
      retainedMatches: all
        .filter((m) => retainedIds.has(m.resource.id))
        .map((m) => ({ status: m.resource.status })),
    });
    const away = dismissed.get(e.id);
    const matches = all
      .filter((m) => !away?.has(m.resource.id) || retainedIds.has(m.resource.id))
      .filter((m, i) => i < 5 || retainedIds.has(m.resource.id))
      // Les extraits ne se calculent que pour ce qui s'affiche.
      .map((m) => ({ ...m, excerpt: excerptForTerms(m.resource, m.shared) }));
    return { e, matches, courseIds, state };
  });
  const summary = summarizeCoverage(rows.map((r) => r.state));
  const counts = filterCounts(rows.map((r) => r.state));
  const segments = coverageSegments(summary);
  const openId = selectedExpectationId(
    rows.map((r) => ({ id: r.e.id, state: r.state })),
    asked,
  );
  const open = rows.find((r) => r.e.id === openId) ?? null;
  const openIndex = open ? rows.indexOf(open) : -1;
  const shown = filterByState(rows, filter);

  // L'attendu ouvert est toujours dans l'adresse : l'enregistrer ne le fait pas changer d'attendu.
  if (openId && asked !== openId) {
    redirect(`/modules/${mod.id}/matching?e=${openId}${filter === "all" ? "" : `&f=${filter}`}`);
  }

  const href = (expectationId: string, f: MatchingFilter = filter) =>
    `/modules/${mod.id}/matching?e=${expectationId}${f === "all" ? "" : `&f=${f}`}`;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Où j’en suis
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Rapprocher les ressources
          </h1>
          <p className="text-muted-foreground mt-1">
            Choisis un attendu à gauche : je te propose des ressources, et tu peux en créer une si
            rien ne convient.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/modules/${mod.id}`}>← Retour au module</Link>
        </Button>
      </div>

      {expectations.length === 0 ? (
        <div className="space-y-4">
          <p className="bg-card rounded-3xl border border-dashed p-5 text-sm">
            Aucun attendu enregistré.{" "}
            <Link href={`/modules/${mod.id}/expectations`} className="underline underline-offset-2">
              Lire les attendus de la fiche
            </Link>{" "}
            pour commencer, ou ajoute le premier ici.
          </p>
          <div className="bg-card max-w-md rounded-3xl border p-5 shadow-sm">
            <AddExpectationForm moduleId={mod.id} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
          <aside
            aria-labelledby="att"
            className="bg-card w-full min-w-0 space-y-3 rounded-3xl border p-5 shadow-sm lg:w-[26rem] lg:flex-none"
          >
            <h2 id="att" className="font-heading text-xl font-bold">
              Les {rows.length} attendus
            </h2>
            <div
              role="img"
              aria-label={formatCoverage(summary)}
              className="bg-muted flex h-2.5 overflow-hidden rounded-full"
            >
              <span className="bg-mint" style={{ width: `${segments.covered}%` }} />
              <span className="bg-sun" style={{ width: `${segments.toBuild}%` }} />
            </div>
            <p role="status" className="text-sm font-medium">
              {formatCoverage(summary)}
            </p>

            <nav aria-label="Filtrer les attendus">
              <ul className="flex flex-wrap gap-1.5">
                {MATCHING_FILTERS.map((f) => (
                  <li key={f.key}>
                    <Link
                      href={`/modules/${mod.id}/matching?${openId ? `e=${openId}&` : ""}f=${f.key}`}
                      aria-current={filter === f.key ? "true" : undefined}
                      className="aria-[current=true]:bg-primary aria-[current=true]:text-primary-foreground hover:bg-accent inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-semibold"
                    >
                      {f.label} · {counts[f.key]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {shown.length ? (
              <ul className="flex flex-col gap-1">
                {shown.map(({ e, state }) => {
                  const current = e.id === openId;
                  return (
                    <li key={e.id}>
                      <Link
                        href={href(e.id)}
                        aria-current={current ? "true" : undefined}
                        className="aria-[current=true]:bg-accent hover:bg-accent/60 flex min-h-11 items-start justify-between gap-2 rounded-xl px-2.5 py-2 text-sm"
                      >
                        <span className={current ? "font-bold" : ""}>
                          {e.label}
                          {isCustomExpectation(e) ? (
                            <span className="text-muted-foreground block text-xs">
                              {CUSTOM_ORIGIN_LABEL}
                            </span>
                          ) : null}
                        </span>
                        <Pill tone={STATE_TONES[state]}>{STATE_LABELS[state]}</Pill>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Aucun attendu dans ce filtre.</p>
            )}

            <div className="space-y-2 border-t pt-3">
              <AddExpectationForm moduleId={mod.id} />
              <Button asChild variant="ghost">
                <Link href={`/modules/${mod.id}/expectations`}>
                  Modifier ou retirer mes attendus
                </Link>
              </Button>
              <p className="text-muted-foreground text-xs">
                Tes attendus se rapprochent des ressources comme ceux de l’école, et apparaissent
                aussi dans la progression envoyée à l’école, signalés « ajouté par l’intervenante ».
              </p>
            </div>
          </aside>

          {open ? (
            <section
              key={open.e.id}
              aria-labelledby="det"
              className="w-full min-w-0 flex-1 space-y-4 lg:basis-0"
            >
              <div className="bg-card rounded-3xl border p-5 shadow-sm">
                <p className="text-muted-foreground mb-1 text-[0.8rem] font-semibold">
                  Attendu {openIndex + 1} sur {rows.length}
                </p>
                <h2 id="det" className="font-heading text-2xl font-bold">
                  {open.e.label}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Pill>{open.e.kind === "objective" ? "Objectif" : "Unité"}</Pill>
                  {isCustomExpectation(open.e) ? (
                    <Pill tone="key">{CUSTOM_ORIGIN_LABEL}</Pill>
                  ) : null}
                  <Pill tone={STATE_TONES[open.state]}>{STATE_LABELS[open.state]}</Pill>
                </div>
              </div>

              <div className="bg-card rounded-3xl border p-5 shadow-sm">
                <h3 className="font-heading mb-3 text-lg font-bold">
                  Ressources qui pourraient convenir
                </h3>
                {open.matches.length ? (
                  <ul className="flex flex-col gap-2.5">
                    {open.matches.map(({ resource, excerpt, level, percent, reason }) => {
                      const isRetained = retainedIds.has(resource.id);
                      return (
                        <li key={resource.id} className="bg-muted/40 space-y-2 rounded-xl p-3.5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/resources/${resource.id}`}
                                  className="font-bold underline-offset-2 hover:underline"
                                >
                                  {resource.title}
                                </Link>
                                <KindBadge kind={resource.kind} />
                                <StatusBadge status={resource.status} />
                              </div>
                              <p>
                                <Pill tone={LEVEL_TONES[level]}>{MATCH_LEVEL_LABELS[level]}</Pill>
                                <span className="text-muted-foreground ml-2 text-xs">
                                  correspondance {percent} %
                                </span>
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {reason}{" "}
                                {resource.moduleNames.length
                                  ? `Sert déjà dans : ${resource.moduleNames.join(", ")}.`
                                  : "Pas encore utilisée."}
                              </p>
                              {excerpt ? (
                                <p className="text-muted-foreground text-xs">
                                  {SEARCH_FIELD_LABELS[excerpt.field]} : {excerpt.before}
                                  <mark className="bg-yellow-200 text-black">{excerpt.match}</mark>
                                  {excerpt.after}
                                </p>
                              ) : null}
                            </div>
                            {isRetained ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <Pill tone="ok">Associée</Pill>
                                <MatchingForm
                                  action={unretainForModule.bind(null, mod.id, resource.id)}
                                  label="Retirer"
                                  pendingLabel="Retrait…"
                                  variant="ghost"
                                  ariaLabel={`Retirer ${resource.title}`}
                                />
                              </div>
                            ) : (
                              <MatchingForm
                                action={retainForModule.bind(null, mod.id, resource.id)}
                                label="Associer à cet attendu"
                                pendingLabel="Association…"
                                ariaLabel={`Associer ${resource.title} à cet attendu`}
                              />
                            )}
                          </div>
                          <details className="text-sm">
                            <summary className="min-h-8 cursor-pointer underline underline-offset-2">
                              Aperçu sans quitter l’écran
                              <span className="sr-only"> : {resource.title}</span>
                            </summary>
                            <div className="bg-background mt-2 max-h-64 overflow-auto rounded-md border p-3 whitespace-pre-wrap">
                              {resource.description ? (
                                <p className="mb-2 font-medium">{resource.description}</p>
                              ) : null}
                              {(resource.content ?? "").trim()
                                ? (resource.content ?? "").trim().slice(0, PREVIEW_LENGTH) +
                                  ((resource.content ?? "").trim().length > PREVIEW_LENGTH
                                    ? "…"
                                    : "")
                                : "Cette ressource n’a pas encore de contenu."}
                            </div>
                            <Link
                              href={`/resources/${resource.id}`}
                              className="mt-2 inline-block underline underline-offset-2"
                            >
                              Ouvrir en entier
                              <span className="sr-only"> : {resource.title}</span>
                            </Link>
                            {isRetained ? null : (
                              <MatchingForm
                                action={dismissMatch.bind(null, mod.id, open.e.id, resource.id)}
                                label="Ce n’est pas la bonne"
                                pendingLabel="Un instant…"
                                variant="ghost"
                                className="mt-1"
                                ariaLabel={`Ce n’est pas la bonne : ${resource.title}`}
                              />
                            )}
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Aucune ressource ne partage de mot-clé avec cet attendu.
                  </p>
                )}
              </div>

              <div className="bg-card rounded-3xl border p-5 shadow-sm">
                <h3 className="font-heading mb-1 text-lg font-bold">Rien ne convient ?</h3>
                <p className="text-muted-foreground mb-3 text-sm">
                  Je crée une ressource vide « à construire », déjà retenue pour ce module. Tu peux
                  aussi{" "}
                  <Link
                    href={`/resources/new?module=${mod.id}&title=${encodeURIComponent(open.e.label)}`}
                    className="underline underline-offset-2"
                  >
                    créer une ressource
                  </Link>{" "}
                  dans la bibliothèque.
                </p>
                <MatchingForm
                  action={buildForExpectation.bind(null, mod.id, open.e.id)}
                  label="Créer et retenir"
                  pendingLabel="Création…"
                  variant="default"
                  className="flex flex-wrap items-end gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label
                      htmlFor={`title-${open.e.id}`}
                      className="text-muted-foreground font-normal"
                    >
                      Nom de la ressource
                    </Label>
                    <Input
                      id={`title-${open.e.id}`}
                      name="title"
                      defaultValue={open.e.label}
                      maxLength={200}
                      required
                    />
                  </div>
                </MatchingForm>
              </div>

              {courses.length ? (
                <form
                  action={setExpectationCourses.bind(null, mod.id, open.e.id)}
                  className="bg-card space-y-3 rounded-3xl border p-5 shadow-sm"
                >
                  <fieldset className="space-y-2.5">
                    <legend className="font-heading mb-1 text-lg font-bold">
                      Couvert par quelles séances ?
                    </legend>
                    <ul className="flex flex-wrap gap-2">
                      {courses.map((c) => (
                        <li
                          key={c.id}
                          className="has-[:checked]:bg-accent flex min-h-11 items-center gap-2 rounded-full border px-3"
                        >
                          <Checkbox
                            id={`c-${open.e.id}-${c.id}`}
                            name="courseIds"
                            value={c.id}
                            defaultChecked={open.courseIds.includes(c.id)}
                          />
                          <Label htmlFor={`c-${open.e.id}-${c.id}`} className="font-normal">
                            {c.title}
                          </Label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                  <Button
                    type="submit"
                    variant="secondary"
                    aria-label={`Enregistrer les séances de « ${open.e.label} »`}
                  >
                    Enregistrer
                  </Button>
                </form>
              ) : null}
            </section>
          ) : null}
        </div>
      )}

      <div className="bg-background/95 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 backdrop-blur md:sticky md:bottom-2">
        <Button asChild variant="ghost">
          <Link href={`/modules/${mod.id}`}>← Retour au module</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-sm">{formatCoverage(summary)}</span>
          <Button asChild>
            <Link href={`/modules/${mod.id}/outline`}>Suite : la progression →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
