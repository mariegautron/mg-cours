"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";

import {
  createGroupsFromWizard,
  type WizardState,
} from "@/app/(app)/modules/[id]/groups/wizard/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  countRepeated,
  defaultGroupNames,
  drawGroups,
  groupsFromChoices,
  seenPairs,
  sizeSpread,
} from "@/lib/groups/draw-groups";

interface Props {
  moduleId: string;
  students: { id: string; name: string }[];
  takenNames: string[];
  pastGroups: string[][];
  hasThemes: boolean;
}

type Way = "draw" | "choice";
const STEPS = ["Manière", "Tirage ou choix", "Récapitulatif"] as const;

/** Assistant « Constituer les groupes » en trois étapes (US-132). */
export function GroupWizard({ moduleId, students, takenNames, pastGroups, hasThemes }: Props) {
  const [step, setStep] = useState(0);
  const [way, setWay] = useState<Way>("draw");
  const [selected, setSelected] = useState<Set<string>>(new Set(students.map((s) => s.id)));
  const [size, setSize] = useState(3);
  const [allowSingle, setAllowSingle] = useState(false);
  const [balanced, setBalanced] = useState(true);
  const [avoid, setAvoid] = useState(true);
  const [groupCount, setGroupCount] = useState(4);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [groups, setGroups] = useState<string[][]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [type, setType] = useState<"tp" | "td" | "project">("project");
  const [assignThemes, setAssignThemes] = useState(false);
  const [problem, setProblem] = useState("");
  const [result, setResult] = useState<WizardState>({});
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const nameOf = new Map(students.map((s) => [s.id, s.name]));
  const seen = seenPairs(pastGroups);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function draw() {
    const res = drawGroups({
      studentIds: [...selected],
      size,
      allowSingle,
      balanced,
      avoidPairs: avoid ? seen : undefined,
      seed: crypto.randomUUID(),
    });
    setGroups(res.groups);
    setProblem("");
  }

  function toRecap() {
    let g = groups;
    if (way === "choice") g = groupsFromChoices(choices, groupCount);
    if (g.length === 0) {
      setProblem(
        way === "draw"
          ? "Tire d’abord les groupes."
          : "Place au moins une personne dans un groupe.",
      );
      return;
    }
    setGroups(g);
    setNames(defaultGroupNames(g.length, takenNames));
    setProblem("");
    setStep(2);
  }

  function create() {
    start(async () => {
      const res = await createGroupsFromWizard(moduleId, {
        type,
        assignThemes: assignThemes && type === "project",
        groups: groups.map((ids, i) => ({ name: names[i] ?? "", studentIds: ids })),
      });
      setResult(res);
    });
  }

  if (result.created) {
    return (
      <section aria-labelledby="done" className="space-y-3 rounded-lg border p-4">
        <h2 id="done" ref={heading} tabIndex={-1} className="text-lg font-medium outline-none">
          {result.created} groupe{result.created > 1 ? "s" : ""} créé{result.created > 1 ? "s" : ""}
        </h2>
        {result.themesMessage ? <p role="status">{result.themesMessage}</p> : null}
        <Link
          className="underline underline-offset-2"
          href={`/modules/${moduleId}#groups-evaluations`}
        >
          Voir les groupes du module
        </Link>
      </section>
    );
  }

  const repeated = countRepeated(groups, seen);

  return (
    <div className="space-y-6">
      <ol aria-label="Étapes" className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`rounded-full border px-3 py-1 ${i === step ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <section aria-labelledby="s1" className="space-y-4">
          <h2 id="s1" ref={heading} tabIndex={-1} className="text-lg font-medium outline-none">
            Comment constituer les groupes ?
          </h2>
          <fieldset className="space-y-2">
            <legend className="sr-only">Manière de constituer les groupes</legend>
            {(
              [
                [
                  "draw",
                  "Tirage au sort",
                  "Tu donnes la taille, je mélange. Tu peux retirer autant que tu veux.",
                ],
                ["choice", "Je choisis moi-même", "Tu places chaque personne dans son groupe."],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="flex items-start gap-3 rounded-lg border p-3">
                <input
                  type="radio"
                  name="way"
                  className="mt-1"
                  checked={way === value}
                  onChange={() => setWay(value)}
                />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="text-muted-foreground text-sm">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Button type="button" onClick={() => setStep(1)}>
            Continuer
          </Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section aria-labelledby="s2" className="space-y-4">
          <h2 id="s2" ref={heading} tabIndex={-1} className="text-lg font-medium outline-none">
            {way === "draw" ? "Tirage au sort" : "Place chaque personne"}
          </h2>

          {way === "draw" ? (
            <>
              <fieldset className="space-y-2">
                <legend className="font-medium">
                  Qui participe ? ({selected.size} sur {students.length})
                </legend>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelected(new Set(students.map((s) => s.id)))}
                  >
                    Tout le monde
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelected(new Set())}
                  >
                    Personne
                  </Button>
                </div>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {students.map((s) => (
                    <li key={s.id}>
                      <label className="flex min-h-9 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                        />
                        {s.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <div className="space-y-1">
                <Label htmlFor="size">Taille visée par groupe</Label>
                <Input
                  id="size"
                  type="number"
                  min={1}
                  max={50}
                  value={size}
                  onChange={(e) => setSize(Math.max(1, Number(e.target.value) || 1))}
                  className="w-24"
                />
              </div>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowSingle}
                    onChange={(e) => setAllowSingle(e.target.checked)}
                  />
                  Un groupe d’une seule personne est permis
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={balanced}
                    onChange={(e) => setBalanced(e.target.checked)}
                  />
                  Tailles équilibrées (au plus une personne d’écart)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={avoid}
                    onChange={(e) => setAvoid(e.target.checked)}
                  />
                  Éviter les binômes déjà vus ensemble
                </label>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={draw}
                disabled={selected.size === 0}
              >
                {groups.length ? "Retirer au sort" : "Tirer au sort"}
              </Button>
              {groups.length ? (
                <div aria-live="polite" className="space-y-2">
                  <p className="text-sm">
                    {groups.length} groupe{groups.length > 1 ? "s" : ""}, écart de taille :{" "}
                    {sizeSpread(groups)}.
                    {avoid
                      ? repeated === 0
                        ? " Aucun binôme déjà vu."
                        : ` ${repeated} binôme${repeated > 1 ? "s" : ""} déjà vu${repeated > 1 ? "s" : ""} (inévitable avec ces réglages).`
                      : ""}
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {groups.map((g, i) => (
                      <li key={i} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">Groupe {i + 1}</p>
                        <p className="text-muted-foreground">
                          {g.map((id) => nameOf.get(id)).join(", ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="count">Nombre de groupes</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={50}
                  value={groupCount}
                  onChange={(e) =>
                    setGroupCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-24"
                />
                <p className="text-muted-foreground text-xs">
                  Un groupe peut ne compter qu’une personne.
                </p>
              </div>
              <ul className="space-y-1">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <label htmlFor={`g-${s.id}`}>{s.name}</label>
                    <select
                      id={`g-${s.id}`}
                      className="bg-background min-h-9 rounded-md border px-2"
                      value={choices[s.id] ?? 0}
                      onChange={(e) =>
                        setChoices((c) => ({ ...c, [s.id]: Number(e.target.value) }))
                      }
                    >
                      <option value={0}>Pas de groupe</option>
                      {Array.from({ length: groupCount }, (_, i) => (
                        <option key={i} value={i + 1}>
                          Groupe {i + 1}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </>
          )}

          {problem ? (
            <p role="alert" className="text-destructive text-sm">
              {problem}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>
              Retour
            </Button>
            <Button type="button" onClick={toRecap}>
              Continuer
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="s3" className="space-y-4">
          <h2 id="s3" ref={heading} tabIndex={-1} className="text-lg font-medium outline-none">
            Récapitulatif
          </h2>
          <ul className="space-y-2">
            {groups.map((g, i) => (
              <li key={i} className="space-y-1 rounded-lg border p-3">
                <Label htmlFor={`name-${i}`}>Nom du groupe {i + 1}</Label>
                <Input
                  id={`name-${i}`}
                  value={names[i] ?? ""}
                  onChange={(e) => setNames((n) => n.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <p className="text-muted-foreground text-sm">
                  {g.map((id) => nameOf.get(id)).join(", ")}
                </p>
              </li>
            ))}
          </ul>
          <div className="space-y-1">
            <Label htmlFor="type">Type des groupes</Label>
            <select
              id="type"
              className="bg-background min-h-9 rounded-md border px-2"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              <option value="project">Projet</option>
              <option value="td">TD</option>
              <option value="tp">TP</option>
            </select>
          </div>
          {type === "project" ? (
            hasThemes ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assignThemes}
                  onChange={(e) => setAssignThemes(e.target.checked)}
                />
                Attribuer tout de suite un thème à chaque groupe (tirage au sort)
              </label>
            ) : (
              <p className="text-muted-foreground text-sm">
                Les thèmes se distribuent ensuite, depuis le projet fil rouge du module.
              </p>
            )
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button type="button" onClick={create} disabled={pending} aria-busy={pending}>
              {pending ? "Création…" : "Créer les groupes"}
            </Button>
          </div>
          {result.error ? <ActionError error={result.error} /> : null}
        </section>
      ) : null}
    </div>
  );
}
