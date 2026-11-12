"use client";

import { useCallback, useId, useRef, useState } from "react";

import type { GradeFormState } from "@/app/(app)/modules/[id]/assessments/actions";
import type { ScaleBand } from "@/lib/assessments/score-scale";
import { GradeForm, type CopyControls } from "@/components/assessments/grade-form";
import type { MemberOverride } from "@/lib/assessments/attendance";
import { Celebration } from "@/components/celebration";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { GridWithCriteria } from "@/lib/assessments/queries";
import {
  correctionProgress,
  neighborId,
  type CopyStatus,
  type ObservationLine,
} from "@/lib/assessments/session";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-guard";
import type { SubmissionLine } from "@/lib/projects/submission-items";
import type { Tables } from "@/types/db";

type Action = (state: GradeFormState, formData: FormData) => Promise<GradeFormState>;

export interface SessionItem {
  /** Clé de la copie (identifiant de l'étudiant·e ou du groupe). */
  id: string;
  /** Absence excusée : rattrapage déjà préparé (lien), sinon `null`. */
  makeupHref?: string | null;
  title: string;
  action: Action;
  grade?: Tables<"grade">;
  observations: ObservationLine[];
  /** Note de groupe : membres et ajustements individuels enregistrés. */
  members?: { id: string; name: string }[];
  memberOverrides?: Record<string, MemberOverride>;
  /** Thème du projet fil rouge du groupe (US-89). */
  theme?: string | null;
  /** Rendus (fichiers et liens) de la personne ou du groupe (US-146). */
  submissions?: SubmissionLine[];
  /** « Bonus certification : +x point(s) sur la moyenne » (note bonus, effet réel enregistré). */
  bonusLine?: string | null;
  /** Réponses au QCM de la personne (lecture seule), à la place de « Aucun rendu ». */
  qcm?: React.ReactNode;
}

export interface SessionSection {
  id: string;
  /** Titre de section (groupe) ; `null` : pas de titre. */
  title: string | null;
  /** Texte affiché quand la section n'a aucune copie. */
  empty?: string;
  items: SessionItem[];
}

/**
 * Correction d'une évaluation sur une page : toutes les copies, avancement « 12/30 corrigées »,
 * enregistrement automatique par copie, avertissement avant de quitter, navigation
 * d'une copie à l'autre et vue « un critère pour toute la classe ».
 */
export function GradingSession({
  sections,
  grid,
  maxScore,
  comments,
  autoValidatedIds,
  subject,
  activeId,
  onActivate,
  absenceRule,
  bonusScale = null,
  initialId,
  initialView,
  overviewHref = "#overview",
}: {
  sections: SessionSection[];
  grid: GridWithCriteria | null;
  maxScore: number;
  comments: Tables<"predefined_comment">[];
  autoValidatedIds: string[];
  subject: string | null;
  /**
   * Oral (US-92) : une seule copie visible, celle du groupe qui passe. Les autres restent montées
   * (masquées), donc leur saisie, l'enregistrement automatique et la garde anti-perte continuent.
   */
  activeId?: string;
  /** Appelé quand la navigation (liste des copies, précédente / suivante) choisit une autre copie. */
  onActivate?: (id: string) => void;
  /** Règle de l'école pour une absence excusée sur une note de groupe. */
  absenceRule?: "keep_group_grade" | "makeup";
  /** Barème d'une note bonus de certification : le score saisi donne la note. */
  bonusScale?: ScaleBand[] | null;
  /** Copie ouverte au départ (page de correction plein écran). */
  initialId?: string;
  /** Vue « par critère » à l’ouverture (`?vue=critere`). */
  initialView?: "copy" | "criterion";
  /** Lien « Vue d'ensemble » de la copie. */
  overviewHref?: string;
}) {
  const uid = useId();
  const items = sections.flatMap((s) => s.items);
  // Copies qui ont déjà une note (compteur « noté x sur y » quand aucun rendu n'est attendu).
  const noted = items.filter((i) => i.grade?.value !== null && i.grade?.value !== undefined).length;
  const ids = items.map((i) => i.id);
  const [status, setStatus] = useState<Record<string, CopyStatus>>({});
  const controls = useRef(new Map<string, CopyControls>());
  const [view, setView] = useState<"copy" | "criterion">(initialView ?? "copy");
  // Une copie à la fois (maquette CorrCopie) : les autres restent montées (saisie, enregistrement
  // automatique et garde anti-perte continuent), seulement masquées.
  const [current, setCurrent] = useState(
    items.some((i) => i.id === initialId) ? (initialId as string) : (items[0]?.id ?? ""),
  );
  // « Déjà noté chez les autres » (US-139) : ce qui est enregistré dans les autres copies.
  const others = items.map((i) => ({
    id: i.id,
    title: i.title,
    scores: i.grade?.scores,
    comments: i.grade?.criterion_comments,
  }));
  const criteria = grid?.criteria ?? [];
  const [criterionId, setCriterionId] = useState(criteria[0]?.id ?? "");

  const onStatus = useCallback((id: string, next: CopyStatus) => {
    setStatus((prev) => {
      const current = prev[id];
      if (
        current &&
        current.corrected === next.corrected &&
        current.dirty === next.dirty &&
        current.partial?.scored === next.partial?.scored &&
        current.partial?.total === next.partial?.total
      ) {
        return prev;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const register = useCallback((id: string, copy: CopyControls | null) => {
    if (copy) controls.current.set(id, copy);
    else controls.current.delete(id);
  }, []);

  const progress = correctionProgress(
    items.map(
      (i) => status[i.id] ?? { corrected: (i.grade?.value ?? null) !== null, dirty: false },
    ),
  );
  useUnsavedChangesGuard(progress.dirty > 0);
  // Copies commencées mais incomplètes : elles ne comptent ni « corrigées » ni dans les moyennes.
  const incomplete = items.flatMap((i) => {
    const partial = status[i.id]?.corrected ? null : status[i.id]?.partial;
    return partial ? [{ item: i, ...partial }] : [];
  });
  // Jalon : toutes les copies corrigées et enregistrées. On ne fête que le passage de « il en reste »
  // à « tout est corrigé » pendant cette visite, pas une évaluation déjà terminée à l'ouverture.
  const complete = progress.total > 0 && progress.done === progress.total && progress.dirty === 0;
  const [wasIncomplete, setWasIncomplete] = useState(!complete);
  if (!complete && !wasIncomplete) setWasIncomplete(true);
  const celebrate = complete && wasIncomplete;

  function focusCopy(id: string) {
    const focus = () => {
      const heading = document.getElementById(`copy-${id}-title`);
      heading?.scrollIntoView({ block: "start" });
      heading?.focus();
    };
    if (onActivate) onActivate(id);
    else setCurrent(id);
    // La copie choisie n'est visible qu'après le rendu suivant.
    setTimeout(focus, 0);
  }

  function moveCriterion(direction: -1 | 1) {
    const next = neighborId(
      criteria.map((c) => c.id),
      criterionId,
      direction,
    );
    if (next) setCriterionId(next);
  }

  const canFocusCriterion = criteria.length > 0 && activeId === undefined;
  const focused = view === "criterion" && canFocusCriterion ? criterionId : null;
  // Copie affichée : celle de l'oral, sinon la copie courante ; toutes en vue « un critère pour toute la classe ».
  const shownId = activeId ?? (focused ? null : current);
  const titleOf = (id: string | null) => items.find((i) => i.id === id)?.title ?? null;

  return (
    <div className="space-y-2">
      <section
        aria-labelledby={`${uid}-progress`}
        className="bg-card space-y-1.5 rounded-xl border px-4 py-2"
      >
        <h2 id={`${uid}-progress`} className="sr-only">
          Avancement de la correction
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="font-medium">
            {progress.label}
            {progress.inProgress > 0 ? ` · ${progress.inProgress} en cours` : ""}
          </p>
          {/* Une seule façon d'enregistrer : automatique, copie par copie (plus de « Enregistrer tout »). */}
          <p className="text-muted-foreground text-sm">
            {progress.dirty > 0
              ? `Enregistrement automatique en cours (${progress.dirty} copie${progress.dirty > 1 ? "s" : ""})`
              : "Tout est enregistré"}
          </p>
        </div>
        {incomplete.length > 0 ? (
          <p className="text-sun text-sm">
            Copies incomplètes, pas encore comptées dans les moyennes :{" "}
            {incomplete.map((c, k) => (
              <span key={c.item.id}>
                {k > 0 ? ", " : ""}
                <a
                  href={`#copy-${c.item.id}`}
                  className="underline underline-offset-2"
                  onClick={(e) => {
                    e.preventDefault();
                    focusCopy(c.item.id);
                  }}
                >
                  {c.item.title}
                </a>{" "}
                ({c.scored}/{c.total} critères)
              </span>
            ))}
            .
          </p>
        ) : null}
        <div aria-live="polite">
          {celebrate ? (
            <Celebration>Tout est corrigé. Tu peux envoyer les résultats.</Celebration>
          ) : null}
        </div>

        {canFocusCriterion ? (
          <div className="flex flex-wrap items-end gap-3">
            <div role="group" aria-label="Vue" className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={view === "copy" ? "default" : "outline"}
                aria-pressed={view === "copy"}
                onClick={() => setView("copy")}
              >
                Vue : par copie
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "criterion" ? "default" : "outline"}
                aria-pressed={view === "criterion"}
                onClick={() => setView("criterion")}
              >
                Vue : par critère
              </Button>
            </div>
            {view === "criterion" ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`${uid}-criterion`} className="text-xs">
                    Critère affiché
                  </Label>
                  <select
                    id={`${uid}-criterion`}
                    value={criterionId}
                    onChange={(e) => setCriterionId(e.target.value)}
                    className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
                  >
                    {criteria.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    neighborId(
                      criteria.map((c) => c.id),
                      criterionId,
                      -1,
                    ) === null
                  }
                  onClick={() => moveCriterion(-1)}
                >
                  Critère précédent
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    neighborId(
                      criteria.map((c) => c.id),
                      criterionId,
                      1,
                    ) === null
                  }
                  onClick={() => moveCriterion(1)}
                >
                  Critère suivant
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {items.length > 1 ? (
          <nav aria-label="Copies" className="flex flex-wrap items-center gap-1.5">
            {/* Une seule navigation entre copies : précédente, toutes les copies, suivante. */}
            {(() => {
              const here = activeId ?? current;
              const prev = neighborId(ids, here, -1);
              const next = neighborId(ids, here, 1);
              return (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={prev === null}
                    onClick={() => {
                      if (!prev) return;
                      if (view === "criterion") setView("copy");
                      focusCopy(prev);
                    }}
                    aria-label={prev ? `Copie précédente : ${titleOf(prev)}` : "Pas de copie avant"}
                  >
                    ←
                  </Button>
                  <ul className="flex flex-wrap items-center gap-1.5 text-sm">
                    {items.map((i) => {
                      const done = status[i.id]?.corrected ?? (i.grade?.value ?? null) !== null;
                      const partial = !done ? status[i.id]?.partial : null;
                      const on = i.id === here && !focused;
                      return (
                        <li key={i.id}>
                          <a
                            href={`#copy-${i.id}`}
                            aria-current={on ? "true" : undefined}
                            onClick={(e) => {
                              e.preventDefault();
                              if (view === "criterion") setView("copy");
                              focusCopy(i.id);
                            }}
                            className={`inline-flex min-h-11 items-center gap-1 rounded-[10px] border px-2.5 ${
                              on ? "border-primary text-primary font-semibold" : "hover:bg-muted"
                            }`}
                          >
                            {i.title}
                            <span className="text-muted-foreground text-xs">
                              {done
                                ? "· corrigée"
                                : partial
                                  ? `· ${partial.scored}/${partial.total}`
                                  : "· à corriger"}
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={next === null}
                    onClick={() => {
                      if (!next) return;
                      if (view === "criterion") setView("copy");
                      focusCopy(next);
                    }}
                    aria-label={next ? `Copie suivante : ${titleOf(next)}` : "Pas de copie après"}
                  >
                    →
                  </Button>
                </>
              );
            })()}
          </nav>
        ) : null}
      </section>

      {focused && grid?.description?.trim() ? (
        <details className="bg-muted/40 rounded-2xl border px-3 py-1">
          <summary className="min-h-8 cursor-pointer py-1 text-sm font-semibold">
            Rappels pédagogiques de la grille
          </summary>
          <p className="text-sm whitespace-pre-wrap">{grid.description.trim()}</p>
        </details>
      ) : null}

      {sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={section.title ? `${uid}-${section.id}` : undefined}
          className="space-y-4"
        >
          {section.title ? (
            <h2 id={`${uid}-${section.id}`} className="text-lg font-semibold">
              {section.title}
            </h2>
          ) : null}
          {section.items.length === 0 && section.empty ? (
            <p className="text-muted-foreground">{section.empty}</p>
          ) : null}
          {section.items.map((item) => {
            const position = items.findIndex((i) => i.id === item.id);
            const received = item.submissions?.length;
            return (
              <div key={item.id} hidden={shownId !== null && item.id !== shownId}>
                {item.qcm ?? null}
                <GradeForm
                  id={item.id}
                  action={item.action}
                  title={item.title}
                  grid={grid}
                  maxScore={maxScore}
                  grade={item.grade}
                  comments={comments}
                  autoValidatedIds={autoValidatedIds}
                  subject={subject}
                  focusCriterionId={focused}
                  observations={item.observations}
                  members={item.members}
                  memberOverrides={item.memberOverrides}
                  theme={item.theme}
                  subtitle={
                    item.members
                      ? null
                      : received === undefined
                        ? // Aucun rendu attendu (note de l'école, oral, écrit en classe, QCM) :
                          // la position de la copie et les notes déjà saisies.
                          `Copie ${position + 1} sur ${items.length} · noté ${noted} sur ${items.length}`
                        : `Rendu ${position + 1} sur ${items.length} · ${received === 0 ? "rien reçu" : `${received} élément${received > 1 ? "s" : ""} reçu${received > 1 ? "s" : ""}`}`
                  }
                  submissions={item.qcm ? undefined : item.submissions}
                  others={others}
                  absenceRule={absenceRule}
                  bonusScale={bonusScale}
                  bonusEffectLine={item.bonusLine ?? null}
                  makeupHref={item.makeupHref ?? null}
                  onStatus={onStatus}
                  register={register}
                  onNavigate={(direction) => {
                    const next = neighborId(ids, item.id, direction);
                    if (next) focusCopy(next);
                  }}
                  prevLabel={titleOf(neighborId(ids, item.id, -1))}
                  nextLabel={titleOf(neighborId(ids, item.id, 1))}
                  overviewHref={activeId === undefined ? overviewHref : null}
                  hasPrev={neighborId(ids, item.id, -1) !== null}
                  hasNext={neighborId(ids, item.id, 1) !== null}
                />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
