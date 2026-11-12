"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { saveOralField } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/oral/space-actions";
import { OralSpace, type OralSpaceInit } from "@/components/assessments/oral-space";
import { SubmissionItems } from "@/components/assessments/submission-items";
import { Button } from "@/components/ui/button";
import type { OralCriterion } from "@/lib/assessments/oral-space";
import { lateLabel, lateMinutes, parisDayTime } from "@/lib/deposits/rules";
import { itemTitle, type SubmissionItemLike } from "@/lib/projects/submission-items";

export interface RenduCopy {
  id: string;
  name: string;
  isGroup: boolean;
  members: { id: string; name: string }[];
  init: OralSpaceInit;
  items: SubmissionItemLike[];
  /** Versions remplacées (plus récente d'abord). */
  history?: { key: string; at: string | null; by: string | null; items: SubmissionItemLike[] }[];
}

const isPdf = (i: SubmissionItemLike) => /\.pdf$/i.test(i.file_name ?? "");
const isImage = (i: SubmissionItemLike) => /\.(png|jpe?g|gif|webp)$/i.test(i.file_name ?? "");

/**
 * Corriger un rendu (fichiers ou liens) : le rendu à gauche, la grille en lettres à droite, une
 * copie à la fois. Même espace de correction que l'oral (lettres, notes privées, écriture tout ou
 * rien, mode lecture d'une note écrite).
 */
export function RenduReview({
  moduleId,
  assessmentId,
  title,
  copies,
  criteria,
  autoValidatedIds,
  maxScore,
  schoolRule,
  deadline,
  initialId,
  initialView,
  withRendu = true,
}: {
  moduleId: string;
  assessmentId: string;
  title: string;
  copies: RenduCopy[];
  criteria: OralCriterion[];
  autoValidatedIds: string[];
  maxScore: number | null;
  schoolRule: "keep_group_grade" | "makeup";
  /** Date limite du dépôt (ISO) : le retard est affiché, sans effet sur la note. */
  deadline: string | null;
  initialId?: string;
  /** « Par critère » à l’ouverture (`?vue=critere`, ancienne page « Comparer un critère »). */
  initialView?: "copy" | "criterion";
  /** Oral : aucun rendu, la grille en lettres prend toute la largeur (pas de bloc « Rendu »). */
  withRendu?: boolean;
}) {
  const start = Math.max(
    0,
    copies.findIndex((c) => c.id === initialId),
  );
  const [index, setIndex] = useState(start);
  const [view, setView] = useState<"copy" | "criterion">(initialView ?? "copy");
  const [criterionId, setCriterionId] = useState(criteria.find((c) => !c.isBonus)?.id ?? "");
  // Lettres posées depuis « Par critère » (copie → critère → lettre / version), par-dessus le chargement.
  const [edits, setEdits] = useState<Record<string, { letter: string; version: number }>>({});
  const router = useRouter();
  const [gapsOpen, setGapsOpen] = useState(false);
  // Copies au brouillon ouvert (« Modifier » sur une note écrite, gardé dans ce navigateur).
  const [drafts, setDrafts] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (view !== "criterion") return;
    const open = new Set<string>();
    for (const c of copies) {
      try {
        if (window.localStorage.getItem(`oral-draft:${assessmentId}:${c.id}`) === "1")
          open.add(c.id);
      } catch {
        // stockage indisponible : la copie reste en lecture ici
      }
    }
    queueMicrotask(() => setDrafts(open));
  }, [view, copies, assessmentId]);
  const [critMessage, setCritMessage] = useState("");
  const letterOf = (c: RenduCopy, critId: string) =>
    edits[`${c.id}|${critId}`]?.letter ?? c.init.letters[critId] ?? "";
  async function setLetterFromView(c: RenduCopy, critId: string, letter: string) {
    const key = `${c.id}|${critId}`;
    const field = `letter:${critId}`;
    const base = edits[key]?.version ?? c.init.versions[field] ?? 0;
    const next = letterOf(c, critId) === letter ? "" : letter;
    const res = await saveOralField(moduleId, assessmentId, c.id, field, next, base);
    if (!res.ok) {
      setCritMessage(
        "conflict" in res && res.conflict
          ? `La lettre de ${c.name} a changé ailleurs : ouvre la copie pour choisir.`
          : "error" in res
            ? res.error
            : "Enregistrement impossible.",
      );
      return;
    }
    setEdits((e) => ({ ...e, [key]: { letter: next, version: res.version } }));
    setCritMessage(`Lettre de ${c.name} enregistrée.`);
    // Relit les espaces : la copie affichera la lettre posée ici.
    router.refresh();
  }
  const copy = copies[index];
  // Chaque copie a sa propre adresse (?copy=…) : un onglet par copie pour comparer.
  useEffect(() => {
    if (!copy) return;
    const url = new URL(window.location.href);
    url.searchParams.set("copy", copy.id);
    window.history.replaceState(null, "", url);
  }, [copy]);
  if (!copy) return <p>Aucune copie à corriger : coche des groupes dans l’évaluation.</p>;
  const go = (d: number) => setIndex((i) => Math.min(copies.length - 1, Math.max(0, i + d)));
  const deposit = copy.items
    .filter((i) => i.added_by === "student" && i.submitted_at)
    .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""))[0];
  const late =
    deposit?.submitted_at && deadline
      ? lateMinutes(new Date(deadline), new Date(deposit.submitted_at))
      : 0;
  const preview = copy.items.find((i) => i.kind !== "link" && (isPdf(i) || isImage(i)));
  const fileHref = (i: SubmissionItemLike) =>
    `/api/assessments/${assessmentId}/submissions/${i.id}`;

  return (
    <div className="space-y-3">
      <div className="bg-background/95 sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2 backdrop-blur">
        <p className="font-semibold">
          {title} · copie {index + 1} sur {copies.length} : {copy.name}
        </p>
        <a
          href={`?copy=${copy.id}`}
          target="_blank"
          rel="noopener"
          className="text-sm underline underline-offset-2"
        >
          Ouvrir dans un nouvel onglet
        </a>
        <div role="group" aria-label="Vue" className="flex gap-1.5">
          {(
            [
              ["copy", "Par copie"],
              ["criterion", "Par critère"],
            ] as const
          ).map(([v, label]) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={view === v ? "default" : "outline"}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === 0}
            onClick={() => go(-1)}
          >
            <ChevronLeft aria-hidden />
            Précédente
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === copies.length - 1}
            onClick={() => go(1)}
          >
            Suivante
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>

      {view === "criterion" ? (
        <section aria-labelledby="by-crit" className="bg-card space-y-3 rounded-2xl border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="by-crit" className="font-heading text-lg font-bold">
              Par critère
            </h2>
            <label className="flex items-center gap-2 text-sm">
              Critère
              <select
                value={criterionId}
                onChange={(e) => setCriterionId(e.target.value)}
                className="border-input bg-background min-h-9 rounded-md border px-2"
              >
                {criteria
                  .filter((c) => !c.isBonus)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-expanded={gapsOpen}
              onClick={() => setGapsOpen((o) => !o)}
            >
              Vérifier mes écarts
            </Button>
            <p role="status" className="text-sm">
              {critMessage}
            </p>
          </div>
          {gapsOpen ? (
            <div className="bg-muted/40 rounded-lg border p-3 text-sm">
              {(["A", "B", "C", "D"] as const).map((l) => {
                const who = copies.filter((c) => letterOf(c, criterionId) === l);
                return (
                  <p key={l}>
                    <strong>{l}</strong> : {who.length ? who.map((c) => c.name).join(", ") : "—"}
                  </p>
                );
              })}
              <p>
                <strong>Sans lettre</strong> :{" "}
                {copies
                  .filter((c) => !letterOf(c, criterionId))
                  .map((c) => c.name)
                  .join(", ") || "—"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Relis côte à côte les copies d’une même lettre : même travail, même lettre.
              </p>
            </div>
          ) : null}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="p-2 font-medium">
                  Copie
                </th>
                <th scope="col" className="p-2 font-medium">
                  Lettre
                </th>
                <th scope="col" className="p-2 font-medium">
                  Commentaire
                </th>
                <th scope="col" className="p-2">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...copies]
                .sort((a, b) => a.name.localeCompare(b.name, "fr"))
                .map((c) => (
                  <tr key={c.id} className="border-b align-top">
                    <th scope="row" className="p-2 text-left font-medium">
                      {c.name}
                    </th>
                    <td className="p-2">
                      {c.init.hasNote && !drafts.has(c.id) ? (
                        <span title="Note écrite : ouvre la copie et clique sur « Modifier »">
                          <strong>{letterOf(c, criterionId) || "—"}</strong>
                          <span className="text-muted-foreground text-xs">
                            {" "}
                            · note écrite : « Modifier » dans la copie
                          </span>
                        </span>
                      ) : (
                        <span
                          role="group"
                          aria-label={`Lettre de ${c.name}`}
                          className="flex gap-1"
                        >
                          {(["A", "B", "C", "D"] as const).map((l) => (
                            <button
                              key={l}
                              type="button"
                              aria-pressed={letterOf(c, criterionId) === l}
                              onClick={() => void setLetterFromView(c, criterionId, l)}
                              className={
                                letterOf(c, criterionId) === l
                                  ? "border-primary bg-primary/10 min-h-9 min-w-9 rounded-md border font-bold"
                                  : "hover:bg-accent min-h-9 min-w-9 rounded-md border font-bold"
                              }
                            >
                              {l}
                            </button>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="p-2 whitespace-pre-wrap">
                      {c.init.texts[`crit:${criterionId}`]?.text || "—"}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIndex(copies.findIndex((x) => x.id === c.id));
                          setView("copy");
                        }}
                      >
                        {withRendu ? "Voir le rendu" : "Voir la copie"}
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <div
        hidden={view !== "copy"}
        className={
          view !== "copy"
            ? "hidden"
            : withRendu
              ? "grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
              : "mx-auto max-w-4xl"
        }
      >
        <section
          hidden={!withRendu}
          aria-labelledby="rendu-title"
          className="bg-card space-y-3 rounded-2xl border p-4 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto"
        >
          <h2 id="rendu-title" className="font-heading text-lg font-bold">
            Rendu
          </h2>
          {copy.items.length === 0 ? <p className="text-sm">Pas de rendu.</p> : null}
          {deposit?.submitted_at &&
          copy.init.startedAt &&
          !copy.init.hasNote &&
          deposit.submitted_at > copy.init.startedAt ? (
            <p role="status" className="border-status-todo bg-muted rounded-lg border p-2 text-sm">
              <strong>
                Nouveau dépôt le {parisDayTime(deposit.submitted_at)}, pendant ta correction.
              </strong>{" "}
              Ce qui est déjà noté reste en place. L’ancien dépôt est dans « Anciennes versions »
              ci-dessous.
            </p>
          ) : null}
          {deposit?.submitted_at ? (
            <p className="text-muted-foreground text-sm">
              Déposé le {parisDayTime(deposit.submitted_at)}
              {deposit.submitted_by_name ? ` par ${deposit.submitted_by_name}` : ""}
              {late > 0 ? ` · en retard de ${lateLabel(late)}` : ""}
            </p>
          ) : null}
          {/* Liste, dépôt manuel et ajout d'un lien sans quitter la correction. */}
          <SubmissionItems
            moduleId={moduleId}
            assessmentId={assessmentId}
            deadline={deadline}
            rows={[
              {
                owner: { kind: copy.isGroup ? "group" : "student", id: copy.id },
                name: copy.name,
                items: copy.items,
                history: copy.history,
              },
            ]}
          />
          {preview ? (
            isPdf(preview) ? (
              <iframe
                title={`Aperçu : ${itemTitle(preview)}`}
                src={fileHref(preview)}
                className="h-[70dvh] w-full rounded-lg border"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fileHref(preview)}
                alt={`Rendu : ${itemTitle(preview)}`}
                className="w-full rounded-lg border"
              />
            )
          ) : null}
        </section>

        <div className="min-w-0">
          <OralSpace
            // Une lettre posée depuis « Par critère » : la page relue change les versions, l'espace
            // est remonté avec l'état du serveur.
            key={`${copy.id}:${Object.values(copy.init.versions).reduce((a, b) => a + b, 0)}`}
            moduleId={moduleId}
            assessmentId={assessmentId}
            subjectId={copy.id}
            subjectName={copy.name}
            isGroup={copy.isGroup}
            members={copy.members}
            criteria={criteria}
            autoValidatedIds={autoValidatedIds}
            maxScore={maxScore}
            schoolRule={schoolRule}
            init={copy.init}
            onNext={index < copies.length - 1 ? () => go(1) : undefined}
            nextLabel="Copie suivante"
            variant="rendu"
          />
        </div>
      </div>
    </div>
  );
}
