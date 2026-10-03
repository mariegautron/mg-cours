"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftRight, Check, Lock, LockOpen, X } from "lucide-react";

import {
  createGroupsFromWizard,
  type WizardState,
} from "@/app/(app)/modules/[id]/groups/wizard/actions";
import { ActionError } from "@/components/action-error";
import { Pill } from "@/components/dashboard/pill";
import { StudentPhoto } from "@/components/students/student-photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import {
  balancedSizes,
  boardSummary,
  countForSize,
  describeSizes,
  newGroup,
  placeStudent,
  redraw,
  removeStudent,
  renameGroup,
  repeatedIn,
  sizeForCount,
  swapStudents,
  toggleGroupLock,
  toggleMemberLock,
  unplaced,
  type BoardGroup,
} from "@/lib/groups/board";
import { defaultGroupNames, seenPairs } from "@/lib/groups/draw-groups";

export interface WizardStudent {
  id: string;
  first: string;
  last: string;
  photoPath: string | null;
}

interface Props {
  moduleId: string;
  moduleName: string;
  students: WizardStudent[];
  takenNames: string[];
  pastGroups: string[][];
  themeCount: number;
}

type Way = "draw" | "choice" | "mix";

const WAYS: { value: Way; label: string; hint: string; go: string }[] = [
  {
    value: "draw",
    label: "Au hasard",
    hint: "Je tire les groupes. Tu peux refaire le tirage, échanger deux personnes, verrouiller un groupe.",
    go: "Tirer les groupes au hasard",
  },
  {
    value: "choice",
    label: "Ils choisissent",
    hint: "Les étudiant·es annoncent leurs groupes, tu les saisis en quelques clics.",
    go: "Saisir les groupes choisis",
  },
  {
    value: "mix",
    label: "Un mélange",
    hint: "Tu places quelques personnes, je tire les autres.",
    go: "Placer puis tirer le reste",
  },
];

const STEP_LABELS = ["La manière", "Les groupes", "Récapitulatif"] as const;
const card = "bg-card rounded-3xl border p-5 shadow-sm";

/** Assistant « Constituer les groupes » en trois étapes (US-132, maquettes Groupes*). */
export function GroupWizard({
  moduleId,
  moduleName,
  students,
  takenNames,
  pastGroups,
  themeCount,
}: Props) {
  const [step, setStep] = useState(0);
  const [way, setWay] = useState<Way>("draw");
  const [selected, setSelected] = useState<Set<string>>(new Set(students.map((s) => s.id)));
  const [pickPresent, setPickPresent] = useState(false);
  const [count, setCount] = useState(() => Math.max(1, Math.round(students.length / 3)));
  const [balanced, setBalanced] = useState(true);
  const [avoid, setAvoid] = useState(true);
  const [groups, setGroups] = useState<BoardGroup[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [type, setType] = useState<"tp" | "td" | "project">("project");
  const [assignThemes, setAssignThemes] = useState(false);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState("");
  const [result, setResult] = useState<WizardState>({});
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const byId = new Map(students.map((s) => [s.id, s]));
  const nameOf = (id: string) => {
    const s = byId.get(id);
    return s ? `${s.first} ${s.last}` : "Étudiant·e";
  };
  const shortName = (id: string) => {
    const s = byId.get(id);
    return s ? `${s.first} ${s.last.charAt(0)}.` : "Étudiant·e";
  };
  const seen = seenPairs(pastGroups);
  const present = students.filter((s) => selected.has(s.id));
  const presentIds = present.map((s) => s.id);
  const photos = students.filter((s) => s.photoPath).length;

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const effectiveCount = Math.min(Math.max(1, count), Math.max(1, presentIds.length));
  const sizesPreview = balancedSizes(presentIds.length, effectiveCount);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function start2() {
    const names = defaultGroupNames(effectiveCount, takenNames);
    const empty = names.map((n, i) => newGroup(`g${i + 1}`, n));
    setChosen(null);
    setSwapping(null);
    setProblem("");
    if (way === "draw") {
      const res = redraw({
        groups: empty,
        studentIds: presentIds,
        avoidPairs: avoid ? seen : undefined,
        seed: crypto.randomUUID(),
      });
      setGroups(res.groups);
      setNote("Tirage fait.");
    } else {
      setGroups(empty);
      setNote("");
    }
    setStep(1);
  }

  function drawAgain() {
    const res = redraw({
      groups,
      studentIds: presentIds,
      avoidPairs: avoid ? seen : undefined,
      seed: crypto.randomUUID(),
    });
    setGroups(res.groups);
    setNote(way === "mix" ? "Les autres personnes sont tirées." : "Nouveau tirage fait.");
  }

  function addGroup() {
    const names = defaultGroupNames(groups.length + 1, [
      ...takenNames,
      ...groups.map((g) => g.name),
    ]);
    const name = names[names.length - 1];
    const idNum = Math.max(0, ...groups.map((g) => Number(g.id.slice(1)) || 0)) + 1;
    setGroups([...groups, newGroup(`g${idNum}`, name)]);
    setNote("Groupe ajouté.");
  }

  function toRecap() {
    if (groups.every((g) => g.members.length === 0)) {
      setProblem(
        way === "draw"
          ? "Tire d’abord les groupes."
          : "Place au moins une personne dans un groupe.",
      );
      return;
    }
    // Les groupes vides ne sont pas créés.
    setGroups(groups.filter((g) => g.members.length > 0));
    setProblem("");
    setStep(2);
  }

  function create() {
    start(async () => {
      const res = await createGroupsFromWizard(moduleId, {
        type,
        assignThemes: assignThemes && type === "project",
        groups: groups.map((g) => ({ name: g.name, studentIds: g.members })),
      });
      setResult(res);
    });
  }

  if (result.created) {
    return (
      <section aria-labelledby="done" className={`${card} space-y-3`}>
        <h2
          id="done"
          ref={heading}
          tabIndex={-1}
          className="font-heading text-2xl font-bold outline-none"
        >
          {result.created} groupe{result.created > 1 ? "s" : ""} créé{result.created > 1 ? "s" : ""}
        </h2>
        {result.themesMessage ? <p role="status">{result.themesMessage}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/modules/${moduleId}/groups`}>Voir les groupes du module</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/present/modules/${moduleId}/groups`}>Projeter la liste des groupes</Link>
          </Button>
        </div>
      </section>
    );
  }

  const summary = boardSummary(groups, presentIds.length);
  const waiting = unplaced(groups, presentIds);
  const repeated = repeatedIn(groups, seen);
  const way_ = WAYS.find((w) => w.value === way)!;

  const stepList = (
    <ol aria-label="Étapes" className="flex flex-wrap items-center gap-3.5">
      {STEP_LABELS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="flex items-center gap-3.5">
            {i > 0 ? (
              <span
                aria-hidden
                className={`h-0.5 w-8 ${done || current ? "bg-mint/60" : "bg-border"}`}
              />
            ) : null}
            <span
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-2.5 font-semibold ${current ? "" : "text-muted-foreground"}`}
            >
              <span
                aria-hidden
                className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? "bg-mint text-background"
                    : current
                      ? "bg-primary text-primary-foreground"
                      : "border"
                }`}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              {label}
              {done ? <span className="sr-only"> (terminée)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );

  const titles = [
    [
      "Constituer les groupes",
      `${moduleName} · ${students.length} étudiant·es, photos comprises. Choisis la manière, je m’occupe du reste.`,
    ],
    [
      way === "draw"
        ? "Le tirage"
        : way === "choice"
          ? "Ils choisissent : je saisis"
          : "Un mélange : tu places, je tire",
      way === "draw"
        ? "Reproductible. Ajuste à ta main : échange deux personnes, verrouille un groupe, renomme."
        : way === "choice"
          ? "Choisis une personne à gauche, puis clique son groupe. Les étudiant·es peuvent renommer leur groupe."
          : "Place les personnes que tu veux garder ensemble, puis je tire les autres au hasard autour d’elles.",
    ],
    [
      "Récapitulatif des groupes",
      "Vérifie, puis enregistre. Tu pourras encore déplacer quelqu’un plus tard.",
    ],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Étudiant·es
          </p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-heading text-3xl font-bold tracking-tight outline-none"
          >
            {titles[step][0]}
          </h1>
          <p className="text-muted-foreground mt-1">{titles[step][1]}</p>
        </div>
        {step === 1 ? (
          <Pill tone={waiting.length === 0 ? "ok" : "warn"}>
            <span role="status">
              {summary.placed} sur {summary.total} placé·es
              {summary.sizes ? ` · ${summary.sizes}` : ""}
            </span>
          </Pill>
        ) : null}
      </div>

      {stepList}

      {step === 0 ? (
        <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
          <div className="w-full min-w-0 flex-1 space-y-4 lg:basis-0">
            <section aria-labelledby="nb" className={card}>
              <h2 id="nb" className="font-heading mb-2.5 text-xl font-bold">
                Combien de groupes ?
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1">
                  <Label htmlFor="count" className="text-muted-foreground font-normal">
                    Nombre de groupes
                  </Label>
                  <Input
                    id="count"
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(e) =>
                      setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))
                    }
                    className="w-28 text-center text-lg font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="size" className="text-muted-foreground font-normal">
                    ou taille visée
                  </Label>
                  <Input
                    id="size"
                    type="number"
                    min={1}
                    max={50}
                    value={sizeForCount(presentIds.length, effectiveCount)}
                    onChange={(e) =>
                      setCount(
                        Math.max(1, countForSize(presentIds.length, Number(e.target.value) || 1)),
                      )
                    }
                    className="w-28 text-center text-lg font-semibold"
                  />
                </div>
                <p className="min-w-0 flex-1">
                  {presentIds.length} étudiant·es en {sizesPreview.length} groupes :{" "}
                  <strong>{describeSizes(sizesPreview) || "—"}</strong>.
                </p>
              </div>
              <p className="text-muted-foreground mt-2 text-[0.8rem]">
                Tu peux aussi donner une taille (« groupes de 3 ») : je calcule le nombre de
                groupes.
              </p>
            </section>

            <section aria-labelledby="ma" className={card}>
              <h2 id="ma" className="font-heading mb-2.5 text-xl font-bold">
                Comment veux-tu les former ?
              </h2>
              <div
                role="radiogroup"
                aria-label="Manière de former les groupes"
                className="grid gap-3 md:grid-cols-3"
              >
                {WAYS.map((w) => (
                  <label
                    key={w.value}
                    className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 ${
                      way === w.value ? "border-primary/70 bg-primary/10" : "bg-muted/40"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="way"
                        checked={way === w.value}
                        onChange={() => setWay(w.value)}
                        className="size-5"
                      />
                      <strong>{w.label}</strong>
                    </span>
                    <span className="text-muted-foreground text-sm">{w.hint}</span>
                  </label>
                ))}
              </div>
            </section>

            <section aria-labelledby="re" className={card}>
              <h2 id="re" className="font-heading mb-1 text-xl font-bold">
                Règles (facultatives)
              </h2>
              <label className="flex min-h-14 items-start gap-3 border-t py-3">
                <input
                  type="checkbox"
                  checked={balanced}
                  onChange={(e) => setBalanced(e.target.checked)}
                  className="mt-1 size-5"
                />
                <span>
                  <strong>Tailles équilibrées</strong>
                  <span className="text-muted-foreground block text-sm">
                    Jamais plus d’une personne d’écart entre deux groupes. Un groupe d’une seule
                    personne reste possible si le nombre de groupes l’impose.
                  </span>
                </span>
              </label>
              <label className="flex min-h-14 items-start gap-3 border-t py-3">
                <input
                  type="checkbox"
                  checked={avoid}
                  onChange={(e) => setAvoid(e.target.checked)}
                  className="mt-1 size-5"
                />
                <span>
                  <strong>Éviter les binômes déjà formés</strong>
                  <span className="text-muted-foreground block text-sm">
                    Ne pas remettre ensemble deux personnes qui étaient dans le même groupe dans un
                    autre module.
                  </span>
                </span>
              </label>
            </section>
          </div>

          <aside
            aria-labelledby="qui"
            className={`${card} w-full min-w-0 space-y-3 lg:w-[26rem] lg:flex-none`}
          >
            <h2 id="qui" className="font-heading text-xl font-bold">
              Qui est concerné·e ?
            </h2>
            <p className="text-muted-foreground text-sm">
              {present.length} étudiant·e{present.length > 1 ? "s" : ""} sur {students.length} ·{" "}
              {photos} photo{photos > 1 ? "s" : ""}
              {students.length - photos > 0
                ? ` (${students.length - photos} manquante${students.length - photos > 1 ? "s" : ""})`
                : ""}
              .
            </p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Étudiant·es concerné·es">
              {present.slice(0, 14).map((s) => (
                <li key={s.id}>
                  <StudentPhoto
                    student={{
                      id: s.id,
                      first_name: s.first,
                      last_name: s.last,
                      photo_path: s.photoPath,
                    }}
                    size="sm"
                  />
                </li>
              ))}
              {present.length > 14 ? (
                <li className="text-muted-foreground self-center text-sm">
                  + {present.length - 14}
                </li>
              ) : null}
            </ul>
            <p className="text-muted-foreground text-sm">
              Un·e étudiant·e absent·e aujourd’hui ? Décoche-le·la avant de tirer, tu l’ajouteras
              ensuite.
            </p>
            <Button
              type="button"
              variant="ghost"
              aria-expanded={pickPresent}
              onClick={() => setPickPresent((v) => !v)}
            >
              Choisir les présent·es
            </Button>
            {pickPresent ? (
              <fieldset className="space-y-2">
                <legend className="sr-only">Qui participe ?</legend>
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
                <ul className="max-h-72 overflow-auto">
                  {students.map((s) => (
                    <li key={s.id}>
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                          className="size-4"
                        />
                        {s.first} {s.last}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ) : null}
            <p className="text-muted-foreground border-t pt-3 text-[0.8rem]">
              Les photos servent à t’y retrouver. Elles ne sont jamais projetées ni exportées.
            </p>
          </aside>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div aria-live="polite" className="sr-only">
            {note}
          </div>
          {repeated > 0 && way !== "choice" ? (
            <p role="status" className="text-sun text-sm font-medium">
              {repeated} binôme{repeated > 1 ? "s" : ""} déjà vu{repeated > 1 ? "s" : ""} ensemble
              (inévitable avec ces réglages).
            </p>
          ) : null}

          <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
            {way !== "draw" || waiting.length > 0 ? (
              <section
                aria-labelledby="sg"
                className={`${card} w-full min-w-0 lg:w-[20rem] lg:flex-none`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 id="sg" className="font-heading text-xl font-bold">
                    Sans groupe
                  </h2>
                  <span className="text-muted-foreground text-sm">
                    {waiting.length} restant·e{waiting.length > 1 ? "s" : ""}
                  </span>
                </div>
                {waiting.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Tout le monde a un groupe.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {waiting.map((id) => {
                      const s = byId.get(id)!;
                      const on = chosen === id;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => setChosen(on ? null : id)}
                            className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 text-left ${
                              on
                                ? "bg-primary/15 border-primary border"
                                : "bg-muted/50 border border-transparent"
                            }`}
                          >
                            <StudentPhoto
                              student={{
                                id: s.id,
                                first_name: s.first,
                                last_name: s.last,
                                photo_path: s.photoPath,
                              }}
                              size="sm"
                            />
                            <strong className="min-w-0 flex-1 truncate">{shortName(id)}</strong>
                            {on ? <Pill tone="key">Choisi·e</Pill> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {chosen ? (
                  <p role="status" className="text-muted-foreground mt-3 text-sm">
                    {nameOf(chosen)} est choisi·e : clique le groupe qu’il ou elle rejoint.
                  </p>
                ) : null}
              </section>
            ) : null}

            <ul
              aria-label="Groupes"
              className="grid w-full min-w-0 flex-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3"
            >
              {groups.map((g, gi) => (
                <li
                  key={g.id}
                  className={`${card} space-y-2 p-4 ${g.locked ? "border-sun/60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`name-${g.id}`} className="sr-only">
                      Nom du groupe {gi + 1}
                    </Label>
                    <Input
                      id={`name-${g.id}`}
                      value={g.name}
                      maxLength={100}
                      onChange={(e) => setGroups(renameGroup(groups, g.id, e.target.value))}
                      className="font-heading min-h-11 flex-1 text-base font-bold"
                    />
                    {g.locked ? (
                      <Pill tone="warn">Verrouillé</Pill>
                    ) : (
                      <Pill>{g.members.length}</Pill>
                    )}
                  </div>
                  {g.members.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Personne pour l’instant.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {g.members.map((id) => {
                        const s = byId.get(id)!;
                        const memberLocked = g.lockedMembers.includes(id);
                        const others = groups
                          .filter((o) => o.id !== g.id)
                          .flatMap((o) => o.members.map((m) => ({ id: m, group: o.name })));
                        return (
                          <li key={id} className="bg-muted/50 rounded-xl px-2 py-1.5">
                            <div className="flex items-center gap-2.5">
                              <StudentPhoto
                                student={{
                                  id: s.id,
                                  first_name: s.first,
                                  last_name: s.last,
                                  photo_path: s.photoPath,
                                }}
                                size="sm"
                              />
                              <strong className="min-w-0 flex-1 truncate">{shortName(id)}</strong>
                              {others.length > 0 ? (
                                <button
                                  type="button"
                                  aria-expanded={swapping === id}
                                  aria-label={`Échanger ${nameOf(id)}`}
                                  onClick={() => setSwapping(swapping === id ? null : id)}
                                  className="hover:bg-accent focus-visible:ring-ring flex size-11 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                                >
                                  <ArrowLeftRight
                                    aria-hidden
                                    className="text-muted-foreground size-4"
                                  />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                aria-pressed={memberLocked}
                                aria-label={`${memberLocked ? "Déverrouiller" : "Verrouiller"} ${nameOf(id)} dans ${g.name}`}
                                onClick={() => setGroups(toggleMemberLock(groups, id))}
                                className="hover:bg-accent focus-visible:ring-ring flex size-11 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                              >
                                {memberLocked ? (
                                  <Lock aria-hidden className="text-sun size-4" />
                                ) : (
                                  <LockOpen aria-hidden className="text-muted-foreground size-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                aria-label={`Retirer ${nameOf(id)} de ${g.name}`}
                                onClick={() => {
                                  setGroups(removeStudent(groups, id));
                                  setNote(`${nameOf(id)} est sans groupe.`);
                                }}
                                className="hover:bg-accent focus-visible:ring-ring flex size-11 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                              >
                                <X aria-hidden className="size-4" />
                              </button>
                            </div>
                            {others.length > 0 && swapping === id ? (
                              <div className="mt-1.5 flex items-center gap-2">
                                <Label htmlFor={`swap-${id}`} className="sr-only">
                                  Échanger {nameOf(id)} avec
                                </Label>
                                <select
                                  id={`swap-${id}`}
                                  defaultValue=""
                                  className="border-input bg-background min-h-11 min-w-0 flex-1 rounded-md border px-2 text-sm"
                                  onChange={(e) => {
                                    if (!e.target.value) return;
                                    setGroups(swapStudents(groups, id, e.target.value));
                                    setNote(
                                      `${nameOf(id)} et ${nameOf(e.target.value)} sont échangé·es.`,
                                    );
                                    setSwapping(null);
                                  }}
                                >
                                  <option value="">Échanger avec…</option>
                                  {others.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {shortName(o.id)} ({o.group})
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => setSwapping(null)}
                                >
                                  Annuler
                                </Button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      aria-pressed={g.locked}
                      onClick={() => setGroups(toggleGroupLock(groups, g.id))}
                    >
                      {g.locked ? "Déverrouiller" : "Verrouiller"}
                      <span className="sr-only"> {g.name}</span>
                    </Button>
                    {chosen ? (
                      <Button
                        type="button"
                        className="min-h-11"
                        onClick={() => {
                          setGroups(placeStudent(groups, chosen, g.id));
                          setNote(`${nameOf(chosen)} est dans ${g.name}.`);
                          setChosen(null);
                        }}
                      >
                        Ajouter {shortName(chosen)} ici
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {way === "choice" ? (
            <Button type="button" variant="outline" onClick={addGroup}>
              Ajouter un groupe
            </Button>
          ) : null}
          <p className="text-muted-foreground text-[0.8rem]">
            Un groupe verrouillé, ou une personne verrouillée, ne bouge pas quand tu refais le
            tirage. Les photos ne sont jamais projetées.
          </p>
          {problem ? (
            <p role="alert" className="text-destructive text-sm">
              {problem}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
          <section aria-labelledby="rg" className={`${card} w-full min-w-0 flex-1 lg:basis-0`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 id="rg" className="font-heading text-xl font-bold">
                {groups.length} groupe{groups.length > 1 ? "s" : ""} · {summary.placed} étudiant·e
                {summary.placed > 1 ? "s" : ""}
              </h2>
              <Pill tone="ok">Aucun groupe vide</Pill>
            </div>
            <ul>
              {groups.map((g, gi) => (
                <li key={g.id} className="flex flex-wrap items-center gap-3 border-t py-3">
                  <div className="w-44 min-w-0">
                    <Label htmlFor={`name-${g.id}`} className="sr-only">
                      Nom du groupe {gi + 1}
                    </Label>
                    <Input
                      id={`name-${g.id}`}
                      value={g.name}
                      maxLength={100}
                      onChange={(e) => setGroups(renameGroup(groups, g.id, e.target.value))}
                      className="font-heading min-h-11 font-bold"
                    />
                    <span className="text-muted-foreground text-[0.8rem]">
                      {g.members.length} personne{g.members.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-1.5" aria-hidden>
                    {g.members.map((id) => {
                      const s = byId.get(id)!;
                      return (
                        <li key={id}>
                          <StudentPhoto
                            student={{
                              id: s.id,
                              first_name: s.first,
                              last_name: s.last,
                              photo_path: s.photoPath,
                            }}
                            size="sm"
                          />
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-muted-foreground min-w-0 flex-1 text-sm">
                    {g.members.map((id) => shortName(id)).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <div className="w-full min-w-0 space-y-4 lg:w-[26rem] lg:flex-none">
            <section aria-labelledby="ve" className={card}>
              <h2 id="ve" className="font-heading mb-2 text-xl font-bold">
                Vérifications
              </h2>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span aria-hidden className={waiting.length === 0 ? "text-mint" : "text-sun"}>
                    {waiting.length === 0 ? "✓" : "!"}
                  </span>
                  {summary.placed} sur {presentIds.length} étudiant·es sont placé·es
                  {waiting.length > 0 ? " : les autres n’auront aucun groupe" : ""}
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="text-mint">
                    ✓
                  </span>
                  Aucun groupe vide (un groupe d’une seule personne est permis)
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="text-mint">
                    ✓
                  </span>
                  Les {groups.length} groupes ont un nom
                  {groups.filter((g) => /^Groupe \d+$/i.test(g.name.trim())).length > 0
                    ? ` (${groups.filter((g) => /^Groupe \d+$/i.test(g.name.trim())).length} gardent « Groupe n »)`
                    : ""}
                </li>
              </ul>
            </section>

            <section aria-labelledby="ty" className={card}>
              <h2 id="ty" className="font-heading mb-2 text-xl font-bold">
                Type des groupes
              </h2>
              <Label htmlFor="type" className="sr-only">
                Type des groupes
              </Label>
              <select
                id="type"
                className="border-input bg-background min-h-11 w-full rounded-md border px-3"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                <option value="project">Projet</option>
                <option value="td">TD</option>
                <option value="tp">TP</option>
              </select>
            </section>

            <section aria-labelledby="et" className={card}>
              <h2 id="et" className="font-heading mb-2 text-xl font-bold">
                Et ensuite ?
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>Attribuer les thèmes du projet</strong>
                  {type === "project" && themeCount > 0 ? (
                    <>
                      <p className="text-muted-foreground">
                        {themeCount} thèmes au choix : les groupes volontaires d’abord, puis tirage
                        pour les autres.
                      </p>
                      <label className="mt-1.5 flex min-h-11 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={assignThemes}
                          onChange={(e) => setAssignThemes(e.target.checked)}
                          className="size-4"
                        />
                        Attribuer tout de suite un thème à chaque groupe (tirage au sort)
                      </label>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      {type === "project"
                        ? "Les thèmes se distribuent ensuite, depuis le projet fil rouge du module."
                        : "Seulement pour les groupes de type « Projet »."}
                    </p>
                  )}
                </div>
                <div className="border-t pt-3">
                  <strong>Montrer les groupes à la classe</strong>
                  <p className="text-muted-foreground">
                    Projette la liste, noms seulement : jamais les photos. Disponible une fois les
                    groupes enregistrés.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      <div className="bg-background/95 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 backdrop-blur md:sticky md:bottom-2">
        <div className="flex flex-wrap items-center gap-3">
          {step === 0 ? (
            <Button type="button" variant="ghost" asChild>
              <Link href={`/modules/${moduleId}/groups`}>Annuler</Link>
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
              {step === 2 ? "← Retour aux groupes" : "← Retour"}
            </Button>
          )}
          {step === 1 && way === "draw" ? (
            <>
              <Button type="button" variant="outline" onClick={drawAgain}>
                Refaire le tirage
              </Button>
              <span className="text-muted-foreground text-sm">
                Les groupes verrouillés restent en place.
              </span>
            </>
          ) : null}
          {step === 1 && way === "mix" ? (
            <Button
              type="button"
              variant="outline"
              onClick={drawAgain}
              disabled={waiting.length === 0}
            >
              Tirer les autres au hasard
            </Button>
          ) : null}
          {step === 1 && way === "choice" && waiting.length > 0 ? (
            <span className="text-muted-foreground text-sm">
              Il reste {waiting.length} personne{waiting.length > 1 ? "s" : ""} sans groupe : tu
              pourras continuer quand même.
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-sm">Étape {step + 1} sur 3</span>
          {step === 0 ? (
            <Button type="button" onClick={start2} disabled={presentIds.length === 0}>
              {way_.go} →
            </Button>
          ) : null}
          {step === 1 ? (
            <Button type="button" onClick={toRecap}>
              Continuer : récapitulatif →
            </Button>
          ) : null}
          {step === 2 ? (
            <PendingButton
              type="button"
              onClick={create}
              pending={pending}
              pendingLabel="Création…"
            >
              Enregistrer les {groups.length} groupe{groups.length > 1 ? "s" : ""}
            </PendingButton>
          ) : null}
        </div>
      </div>
      {step === 2 && result.error ? <ActionError error={result.error} /> : null}
    </div>
  );
}
