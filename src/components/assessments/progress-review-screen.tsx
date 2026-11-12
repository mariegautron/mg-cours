"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  finishReview,
  publishReviews,
  saveReviewField,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/etape/actions";
import { SubmissionItems } from "@/components/assessments/submission-items";
import { useVersionedFields, type FieldSaver } from "@/components/assessments/use-oral-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  isReviewMark,
  proposeComment,
  proposeGlobal,
  REVIEW_MARK_KEYS,
  REVIEW_MARK_LABELS,
  REVIEW_MARKS,
  REVIEW_STATE_LABELS,
  reviewGaps,
  type ReviewMark,
  type ReviewState,
} from "@/lib/assessments/progress-review";
import { lateLabel, lateMinutes, parisDayTime } from "@/lib/deposits/rules";
import { itemTitle, type SubmissionItemLike } from "@/lib/projects/submission-items";
import { cn } from "@/lib/utils";

export interface ReviewCriterion {
  id: string;
  label: string;
  /** Phrases des paliers, du plus haut au plus bas : repères de lecture seulement. */
  levels: string[];
}

export interface ReviewCopy {
  id: string;
  name: string;
  isGroup: boolean;
  members: { id: string; name: string }[];
  items: SubmissionItemLike[];
  history?: { key: string; at: string | null; by: string | null; items: SubmissionItemLike[] }[];
  values: Record<string, string>;
  versions: Record<string, number>;
  state: ReviewState;
  /** Début du retour (création de la ligne) : un dépôt plus récent affiche le bandeau. */
  startedAt: string | null;
}

const MARK_TONE: Record<ReviewMark, string> = {
  ahead: "border-mint bg-muted",
  on_track: "border-primary bg-muted",
  review: "border-sun bg-muted",
};

const isPdf = (i: SubmissionItemLike) => /\.pdf$/i.test(i.file_name ?? "");
const isImage = (i: SubmissionItemLike) => /\.(png|jpe?g|gif|webp)$/i.test(i.file_name ?? "");

/**
 * Commenter un point d'étape : le rendu à gauche, un repère et un commentaire par critère à droite
 * (« En avance », « Sur la bonne voie », « À revoir »). Aucune note, aucun point, aucune présence.
 */
export function ProgressReviewScreen({
  moduleId,
  assessmentId,
  title,
  copies,
  criteria,
  deadline,
  initialId,
  doneCount,
  publishable,
}: {
  moduleId: string;
  assessmentId: string;
  title: string;
  copies: ReviewCopy[];
  criteria: ReviewCriterion[];
  deadline: string | null;
  initialId?: string;
  /** Retours terminés (sur `copies.length`). */
  doneCount: number;
  /** Retours terminés pas encore publiés dans leur dernière version. */
  publishable: number;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(
    Math.max(
      0,
      copies.findIndex((c) => c.id === initialId),
    ),
  );
  const [view, setView] = useState<"copy" | "criterion">("copy");
  const [criterionId, setCriterionId] = useState(criteria[0]?.id ?? "");
  const [publishing, startPublish] = useTransition();
  const [publishMessage, setPublishMessage] = useState("");
  const copy = copies[index];

  useEffect(() => {
    if (!copy) return;
    const url = new URL(window.location.href);
    url.searchParams.set("copy", copy.id);
    window.history.replaceState(null, "", url);
  }, [copy]);

  if (!copy) return <p>Aucune copie : coche des groupes dans le point d’étape.</p>;
  const go = (d: number) => setIndex((i) => Math.min(copies.length - 1, Math.max(0, i + d)));

  const publish = () =>
    startPublish(async () => {
      const res = await publishReviews(moduleId, assessmentId);
      setPublishMessage(
        res.error ??
          `${res.published ?? 0} retour${(res.published ?? 0) > 1 ? "s" : ""} publié${(res.published ?? 0) > 1 ? "s" : ""} dans l’espace des étudiant·es.`,
      );
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <div className="bg-background/95 sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2 backdrop-blur">
        <p className="font-semibold">
          {title} · copie {index + 1} sur {copies.length} : {copy.name}
        </p>
        <p className="text-muted-foreground text-sm">
          {doneCount} retour{doneCount > 1 ? "s" : ""} terminé{doneCount > 1 ? "s" : ""} sur{" "}
          {copies.length}
        </p>
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
              onClick={() => {
                setView(v);
                if (v === "criterion") router.refresh();
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={publishing || publishable === 0}
            onClick={publish}
            title={
              publishable === 0
                ? "Rien de nouveau à publier : termine d’abord un retour."
                : undefined
            }
          >
            {publishing
              ? "Publication…"
              : `Mettre à jour l’espace étudiant${publishable ? ` (${publishable})` : ""}`}
          </Button>
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
        <p role="status" className="basis-full text-sm empty:hidden">
          {publishMessage}
        </p>
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
                className="border-input bg-background min-h-11 rounded-md border px-2"
              >
                {criteria.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="bg-muted/40 rounded-lg border p-3 text-sm">
            {REVIEW_MARKS.map((m) => {
              const who = copies.filter((c) => c.values[`mark:${criterionId}`] === m);
              return (
                <p key={m}>
                  <strong>{REVIEW_MARK_LABELS[m]}</strong> :{" "}
                  {who.length ? who.map((c) => c.name).join(", ") : "—"}
                </p>
              );
            })}
            <p>
              <strong>Sans repère</strong> :{" "}
              {copies
                .filter((c) => !isReviewMark(c.values[`mark:${criterionId}`]))
                .map((c) => c.name)
                .join(", ") || "—"}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="p-2 font-medium">
                  Copie
                </th>
                <th scope="col" className="p-2 font-medium">
                  Repère
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
              {copies.map((c, i) => {
                const mark = c.values[`mark:${criterionId}`];
                return (
                  <tr key={c.id} className="border-b align-top">
                    <th scope="row" className="p-2 text-left font-medium">
                      {c.name}
                    </th>
                    <td className="p-2">
                      {isReviewMark(mark) ? (
                        <span className={cn("rounded-md border px-2 py-0.5", MARK_TONE[mark])}>
                          {REVIEW_MARK_LABELS[mark]}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2 whitespace-pre-wrap">
                      {c.values[`comment:${criterionId}`] || "—"}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIndex(i);
                          setView("copy");
                        }}
                      >
                        Ouvrir la copie
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <RenduColumn
            moduleId={moduleId}
            assessmentId={assessmentId}
            copy={copy}
            deadline={deadline}
          />
          <ReviewPanel
            key={copy.id}
            moduleId={moduleId}
            assessmentId={assessmentId}
            copy={copy}
            criteria={criteria}
            onNext={index < copies.length - 1 ? () => go(1) : undefined}
          />
        </div>
      )}
    </div>
  );
}

function RenduColumn({
  moduleId,
  assessmentId,
  copy,
  deadline,
}: {
  moduleId: string;
  assessmentId: string;
  copy: ReviewCopy;
  deadline: string | null;
}) {
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
    <section
      aria-labelledby="rendu-title"
      className="bg-card space-y-3 rounded-2xl border p-4 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto"
    >
      <h2 id="rendu-title" className="font-heading text-lg font-bold">
        Dépôt
      </h2>
      {copy.items.length === 0 ? (
        <p className="text-muted-foreground bg-muted/40 rounded-lg border p-2 text-sm">
          Pas de dépôt. Tu peux quand même écrire un retour : ni absence, ni 0.
        </p>
      ) : null}
      {deposit?.submitted_at &&
      copy.startedAt &&
      copy.state !== "done" &&
      copy.state !== "published" &&
      deposit.submitted_at > copy.startedAt ? (
        <p role="status" className="border-status-todo bg-muted rounded-lg border p-2 text-sm">
          <strong>
            Nouveau dépôt le {parisDayTime(deposit.submitted_at)}, pendant ton retour.
          </strong>{" "}
          Ce qui est déjà écrit reste en place.
        </p>
      ) : null}
      {deposit?.submitted_at ? (
        <p className="text-muted-foreground text-sm">
          Déposé le {parisDayTime(deposit.submitted_at)}
          {deposit.submitted_by_name ? ` par ${deposit.submitted_by_name}` : ""}
          {late > 0 ? ` · en retard de ${lateLabel(late)} (sans effet)` : ""}
        </p>
      ) : null}
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
            alt={`Dépôt : ${itemTitle(preview)}`}
            className="w-full rounded-lg border"
          />
        )
      ) : null}
    </section>
  );
}

function ReviewPanel({
  moduleId,
  assessmentId,
  copy,
  criteria,
  onNext,
}: {
  moduleId: string;
  assessmentId: string;
  copy: ReviewCopy;
  criteria: ReviewCriterion[];
  onNext?: () => void;
}) {
  const router = useRouter();
  const save = useCallback<FieldSaver>(
    (field, value, baseVersion, force) =>
      saveReviewField(moduleId, assessmentId, copy.id, field, value, baseVersion, force),
    [moduleId, assessmentId, copy.id],
  );
  const f = useVersionedFields(save, { values: copy.values, versions: copy.versions });
  const [state, setState] = useState<ReviewState>(copy.state);
  const [showRecap, setShowRecap] = useState(false);
  const [finishing, startFinish] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const marks: Record<string, string> = {};
  const comments: Record<string, string> = {};
  for (const c of criteria) {
    marks[c.id] = f.values[`mark:${c.id}`] ?? "";
    comments[c.id] = f.values[`comment:${c.id}`] ?? "";
  }
  const global = f.values.global ?? "";
  const gaps = reviewGaps(criteria, marks, comments, global);

  // Modifier un retour terminé le repasse « en cours » (même règle que le serveur).
  const setPublic = (field: string, value: string, immediate = false) => {
    f.set(field, value, immediate);
    if (state === "done" || state === "published") setState("in_progress");
    else if (state === "to_comment") setState("in_progress");
  };

  function pickMark(criterionId: string, mark: ReviewMark) {
    const field = `mark:${criterionId}`;
    setPublic(field, f.values[field] === mark ? "" : mark, true);
  }

  function onCardKey(e: React.KeyboardEvent, criterionId: string) {
    const target = e.target as HTMLElement;
    if (["TEXTAREA", "INPUT", "SELECT"].includes(target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const mark = REVIEW_MARK_KEYS[e.key.toUpperCase()];
    if (mark) {
      e.preventDefault();
      pickMark(criterionId, mark);
    }
  }

  const finish = (done: boolean) =>
    startFinish(async () => {
      await f.flush();
      const res = await finishReview(moduleId, assessmentId, copy.id, done);
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setState(done ? "done" : "in_progress");
      setShowRecap(false);
      router.refresh();
    });

  const status = f.hasConflict
    ? "Conflit à résoudre"
    : f.failed
      ? "Pas enregistré"
      : f.saving
        ? "Enregistrement…"
        : f.dirty
          ? "Modifications en attente…"
          : f.savedAt
            ? `Enregistré à ${f.savedAt}`
            : "Tout est enregistré";

  const conflictBox = (field: string, label: string) =>
    field in f.conflicts ? (
      <div
        role="alert"
        className="border-status-todo bg-muted space-y-1 rounded-lg border p-2 text-sm"
      >
        <p className="font-semibold">{label} a changé dans un autre onglet.</p>
        <p>
          <span className="font-medium">Ici :</span> {f.values[field] || "(vide)"}
        </p>
        <p>
          <span className="font-medium">Ailleurs :</span> {f.conflicts[field] || "(vide)"}
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => f.keepMine(field)}>
            Garder la mienne
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => f.takeTheirs(field)}>
            Prendre l’autre
          </Button>
        </div>
      </div>
    ) : null;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-xl font-bold">{copy.name}</h2>
        <span className="rounded-md border px-2 py-0.5 text-sm">{REVIEW_STATE_LABELS[state]}</span>
        <p role="status" className="text-muted-foreground ml-auto text-sm">
          {status}
        </p>
      </div>
      <p className="text-muted-foreground text-sm">
        Point d’étape sans note. Un repère par critère : en avance, sur la bonne voie ou à revoir.
      </p>

      {criteria.map((c) => {
        const mark = marks[c.id];
        const commentField = `comment:${c.id}`;
        return (
          <section
            key={c.id}
            aria-labelledby={`crit-${c.id}`}
            tabIndex={-1}
            onKeyDown={(e) => onCardKey(e, c.id)}
            className="bg-card space-y-2 rounded-2xl border p-4"
          >
            <h3 id={`crit-${c.id}`} className="font-semibold">
              {c.label}
            </h3>
            <div role="group" aria-label={`Repère : ${c.label}`} className="flex flex-wrap gap-2">
              {REVIEW_MARKS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mark === m}
                  onClick={() => pickMark(c.id, m)}
                  className={cn(
                    "focus-visible:ring-ring min-h-11 rounded-xl border-[1.5px] px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none",
                    mark === m ? MARK_TONE[m] : "hover:bg-accent",
                  )}
                >
                  {REVIEW_MARK_LABELS[m]}
                  <span className="text-muted-foreground ml-1 text-xs" aria-hidden>
                    ({m === "ahead" ? "A" : m === "on_track" ? "V" : "R"})
                  </span>
                </button>
              ))}
            </div>
            {c.levels.length ? (
              <details className="text-sm">
                <summary className="text-muted-foreground cursor-pointer">
                  Paliers de la grille (repères de lecture)
                </summary>
                <ol className="text-muted-foreground mt-1 list-decimal space-y-0.5 pl-5">
                  {c.levels.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ol>
              </details>
            ) : null}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={`c-${copy.id}-${c.id}`} className="text-sm font-medium">
                  Commentaire
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!isReviewMark(mark)}
                  title={isReviewMark(mark) ? undefined : "Choisis d’abord un repère."}
                  onClick={() =>
                    isReviewMark(mark) &&
                    setPublic(commentField, proposeComment(mark, c.label, copy.isGroup))
                  }
                >
                  Proposer
                </Button>
              </div>
              <Textarea
                id={`c-${copy.id}-${c.id}`}
                rows={2}
                maxLength={5000}
                value={f.values[commentField] ?? ""}
                onChange={(e) => setPublic(commentField, e.target.value)}
              />
              {conflictBox(commentField, "Ce commentaire")}
              {conflictBox(`mark:${c.id}`, "Ce repère")}
            </div>
          </section>
        );
      })}

      <section aria-labelledby="global-title" className="bg-card space-y-2 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="global-title" className="font-semibold">
            <label htmlFor={`g-${copy.id}`}>Commentaire global</label>
          </h3>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPublic("global", proposeGlobal(marks, criteria, copy.isGroup))}
          >
            Proposer
          </Button>
        </div>
        <Textarea
          id={`g-${copy.id}`}
          rows={4}
          maxLength={10000}
          value={global}
          onChange={(e) => setPublic("global", e.target.value)}
        />
        {conflictBox("global", "Le commentaire global")}
      </section>

      {copy.isGroup && copy.members.length ? (
        <section
          aria-labelledby="members-title"
          className="bg-card space-y-2 rounded-2xl border p-4"
        >
          <h3 id="members-title" className="font-semibold">
            Membres : mot perso (facultatif)
          </h3>
          <p className="text-muted-foreground text-sm">
            Vu par la personne seule, dans son espace. Pas de présence ni d’absence ici.
          </p>
          {copy.members.map((m) => (
            <div key={m.id} className="space-y-1">
              <label htmlFor={`p-${copy.id}-${m.id}`} className="text-sm font-medium">
                {m.name}
              </label>
              <Textarea
                id={`p-${copy.id}-${m.id}`}
                rows={2}
                maxLength={5000}
                value={f.values[`person:${m.id}`] ?? ""}
                onChange={(e) => setPublic(`person:${m.id}`, e.target.value)}
              />
            </div>
          ))}
        </section>
      ) : null}

      <section aria-labelledby="private-title" className="space-y-1 rounded-2xl border p-4">
        <h3 id="private-title" className="font-semibold">
          <label htmlFor={`n-${copy.id}`}>Mes notes (pour toi seule, jamais envoyées)</label>
        </h3>
        <Textarea
          id={`n-${copy.id}`}
          rows={3}
          maxLength={20000}
          value={f.values.private ?? ""}
          onChange={(e) => f.set("private", e.target.value)}
        />
      </section>

      <div className="bg-background/95 sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border p-3">
        {state === "done" || state === "published" ? (
          <>
            <p className="text-sm font-semibold">
              Retour terminé{state === "published" ? " et publié" : " : pas encore publié"}.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={finishing}
              onClick={() => finish(false)}
            >
              Rouvrir le retour
            </Button>
          </>
        ) : (
          <Button type="button" onClick={() => setShowRecap((s) => !s)} aria-expanded={showRecap}>
            Terminer le retour
          </Button>
        )}
        {onNext ? (
          <Button type="button" variant="outline" onClick={onNext}>
            Copie suivante
          </Button>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive basis-full text-sm">
            {error}
          </p>
        ) : null}
        {showRecap && state !== "done" && state !== "published" ? (
          <div className="basis-full space-y-2 rounded-lg border p-3 text-sm">
            {gaps.length ? (
              <>
                <p className="font-semibold">À vérifier (rien n’est bloquant) :</p>
                <ul className="list-disc pl-5">
                  {gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Chaque critère a son repère et son commentaire.</p>
            )}
            <p className="text-muted-foreground">
              Le dépôt se ferme une fois le retour terminé. Les étudiant·es le verront après «
              Mettre à jour l’espace étudiant ».
            </p>
            <Button type="button" disabled={finishing} onClick={() => finish(true)}>
              {finishing ? "Un instant…" : "Terminer le retour"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
