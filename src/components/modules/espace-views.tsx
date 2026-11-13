import Link from "next/link";

import { ContactLine } from "@/components/modules/contact-line";

import { Markdown, markdownOutline } from "@/components/markdown";
import { CriterionLevels } from "@/components/results/criterion-levels";
import { FriseProjected } from "@/components/modules/frise-view";
import { formatMinutes } from "@/lib/modules/activity";
import { documentKind } from "@/lib/modules/espace";
import { formatSize } from "@/lib/storage/files";
import {
  dueLabel,
  flatFiches,
  isNoDepositEvaluation,
  nextEvaluationIndex,
  quizIsOpen,
  type Espace,
  type EspaceEvaluation,
} from "@/lib/modules/espace";
import { lateLabel, parisDayTime, parisLongDateTime } from "@/lib/deposits/rules";
import { kindOf } from "@/lib/assessments/individual";
import { sessionHeading, type Frise } from "@/lib/modules/frise";
import type { PublicSheet } from "@/lib/result-links/sheet";

/**
 * Tableau de bord du cours (espace étudiant·e, desktop d'abord) : menu à gauche, contenu à droite.
 * Les étudiant·es sont vouvoyé·es. Aucune donnée privée : tout vient de l'instantané publié.
 */
export interface EspaceData {
  token: string;
  /** Préfixe des adresses (`/espace/<jeton>`). */
  base: string;
  firstName: string | null;
  frise: Frise;
  espace: Espace | null;
  results: { sheet: PublicSheet; publishedAt: string | null }[];
  publishedAt: string | null;
  /** Dépôts de cette personne (ou de son groupe), par évaluation : heure serveur et retard en minutes. */
  deposits?: Record<string, { at: string; late: number }>;
  /** Copie du QCM ouvert déjà rendue par cette personne (date de remise). */
  quizSubmittedAt?: string | null;
  /** Excusé·e au QCM principal, rattrapage prévu : pas d'invitation à passer le QCM. */
  quizMakeupPlanned?: boolean;
}

export type EspaceSection = "accueil" | "cours" | "projet" | "evaluation" | "notes";

/** « 1 pt », « 1,5 pt », « 3 pts » : virgule française, pluriel à partir de 2. */
const pts = (n: number) =>
  `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} pt${n >= 2 ? "s" : ""}`;

const card = "bg-card rounded-xl border p-5 shadow-sm";
const tile =
  "bg-card hover:bg-accent focus-visible:ring-ring block rounded-xl border p-5 shadow-sm focus-visible:ring-2 focus-visible:outline-none";

export function EspaceLayout({
  data,
  current,
  children,
}: {
  data: EspaceData;
  current: EspaceSection;
  children: React.ReactNode;
}) {
  const { base, espace, frise, results } = data;
  const items: { key: EspaceSection; label: string; href: string; show: boolean }[] = [
    { key: "accueil", label: "Accueil", href: base, show: true },
    {
      key: "evaluation",
      label: "Évaluations",
      href: `${base}/evaluation`,
      show: !!espace?.evaluations.length,
    },
    { key: "cours", label: "Cours", href: `${base}/cours`, show: !!espace?.courses.length },
    { key: "projet", label: "Projet", href: `${base}/projet`, show: !!espace?.brief },
    { key: "notes", label: "Notes et corrigés", href: `${base}/notes`, show: true },
  ];
  return (
    <div className="mx-auto min-h-dvh max-w-[90rem] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#contenu"
        className="focus:bg-background sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:p-3"
      >
        Aller au contenu
      </a>
      <aside className="border-b p-4 lg:border-r lg:border-b-0 lg:p-6 [@media(max-height:500px)]:py-2">
        <div className="lg:sticky lg:top-6">
          <p className="text-muted-foreground text-[0.8125rem] font-medium max-lg:hidden">
            Mon espace
          </p>
          {/* Téléphone : en-tête d'une ligne ; les onglets sont fixés en bas de l'écran (lot 5, 27). */}
          <p className="font-heading mt-1 text-lg leading-tight font-bold max-lg:mt-0 max-lg:truncate max-lg:text-base [@media(max-height:500px)]:mt-0 [@media(max-height:500px)]:text-base">
            <span className="lg:hidden">Mon espace · </span>
            {frise.moduleName}
          </p>
          <nav
            aria-label="Espace étudiant·e"
            className="max-lg:bg-background mt-4 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:mt-0 max-lg:border-t max-lg:px-1 max-lg:pb-[env(safe-area-inset-bottom)]"
          >
            <ul className="flex flex-wrap gap-2 max-lg:flex-nowrap max-lg:justify-around max-lg:gap-0 lg:flex-col lg:gap-1">
              {items
                .filter((i) => i.show)
                .map((i) => (
                  <li key={i.key}>
                    <Link
                      href={i.href}
                      aria-current={i.key === current ? "page" : undefined}
                      className={`focus-visible:ring-ring flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none max-lg:min-h-12 max-lg:px-2 max-lg:text-xs ${
                        i.key === current ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      }`}
                    >
                      {i.key === "notes" ? (
                        <>
                          <span className="lg:hidden">Notes</span>
                          <span className="max-lg:hidden">{i.label}</span>
                        </>
                      ) : (
                        i.label
                      )}
                      {i.key === "notes" && results.length ? (
                        <span className="text-xs font-normal">{results.length}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
          {data.publishedAt ? (
            <p className="text-muted-foreground mt-6 hidden text-xs lg:block">
              Mise à jour le {new Date(data.publishedAt).toLocaleDateString("fr-FR")}.
            </p>
          ) : null}
        </div>
      </aside>
      <div className="min-w-0">
        <main id="contenu" tabIndex={-1} className="p-4 outline-none lg:p-10">
          {children}
        </main>
        <div className="text-muted-foreground space-y-1 border-t px-4 py-3 text-xs max-lg:pb-24 lg:px-10">
          <ContactLine tone="tu" />
          <p>Ce lien est personnel : ne le partage pas.</p>
        </div>
      </div>
    </div>
  );
}

/** État du rendu en une phrase, au tutoiement : rendu, rendu en retard, à rendre, ou pas encore rendu. */
function depositStatus(
  e: EspaceEvaluation,
  due: string | null,
  deposit: { at: string; late: number } | undefined,
  today: string,
): string | null {
  if (e.submit.mode !== "app") return null;
  if (deposit) {
    const when = parisDayTime(deposit.at);
    return deposit.late > 0 ? `Rendu en retard (${lateLabel(deposit.late)})` : `Rendu le ${when}`;
  }
  if (due && due < today) {
    return "Pas encore rendu. Tu peux encore déposer, ce sera signalé en retard.";
  }
  return null;
}

/** « Il te reste 2 jours » à 3 jours ou moins de la date limite ; sinon `null`. */
function reminder(due: string | null, today: string): string | null {
  if (!due || due < today) return null;
  const days = Math.round(
    (new Date(`${due}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000,
  );
  if (days > 3) return null;
  return days === 0 ? "C’est aujourd’hui." : `Il te reste ${days} jour${days > 1 ? "s" : ""}.`;
}

function dateOfEvaluation(e: EspaceEvaluation, frise: Frise) {
  return (
    e.date ??
    (e.sessionNumber
      ? (frise.sessions.find((s) => s.number === e.sessionNumber)?.date ?? null)
      : null)
  );
}

export function AccueilView({ data }: { data: EspaceData }) {
  const { base, espace, frise, results, firstName } = data;
  const today = new Date().toISOString().slice(0, 10);
  // Exclues de « Prochain rendu » : déjà rendue, note publiée, oral ou point d'étape sans dépôt.
  const noted = new Set(results.map((r) => r.sheet.title));
  const settled = new Set([
    ...Object.keys(data.deposits ?? {}),
    ...(espace?.evaluations ?? [])
      .filter((e) => noted.has(e.title) || isNoDepositEvaluation(e))
      .map((e) => e.id),
  ]);
  const nextIndex = nextEvaluationIndex(espace, frise, today, settled);
  const next = nextIndex !== null ? espace!.evaluations[nextIndex] : null;
  const quizOpen = quizIsOpen(espace?.quiz ?? null);

  return (
    <div className="space-y-6">
      <h1>Bonjour{firstName ? ` ${firstName}` : ""}</h1>

      {quizOpen && espace?.quiz ? (
        <section aria-labelledby="quiz" className="bg-card card-featured rounded-xl border p-4">
          <h2 id="quiz" className="title-display text-xl">
            {data.quizMakeupPlanned
              ? "Rattrapage prévu"
              : data.quizSubmittedAt
                ? "Ton évaluation individuelle est rendue"
                : "Ton évaluation individuelle est ouverte"}
          </h2>
          <p className="mt-1">
            {espace.quiz.title}
            {espace.quiz.closesAt ? ` · jusqu’au ${parisLongDateTime(espace.quiz.closesAt)}` : ""}
          </p>
          {data.quizMakeupPlanned ? (
            <p className="mt-2">
              Tu passeras l’évaluation en rattrapage : Marie te donnera la date et le lien.
            </p>
          ) : data.quizSubmittedAt ? (
            <p className="mt-2 font-semibold">
              Copie rendue le {parisLongDateTime(data.quizSubmittedAt)}.
            </p>
          ) : espace.quiz.url ? (
            <a
              href={espace.quiz.url}
              className="bg-primary text-primary-foreground focus-visible:ring-ring mt-3 inline-flex min-h-11 items-center rounded-lg px-4 font-semibold focus-visible:ring-2 focus-visible:outline-none"
            >
              Passer le QCM
            </a>
          ) : (
            <p className="text-muted-foreground mt-2 text-sm">
              Utilise le lien du QCM qui t’a été donné en classe.
            </p>
          )}
        </section>
      ) : null}

      {!next && espace?.evaluations.length ? (
        <p className="text-muted-foreground">Rien à rendre pour l’instant.</p>
      ) : null}

      {next && nextIndex !== null ? (
        <section aria-labelledby="prochain" className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-[0.8125rem] font-medium">Prochain rendu</p>
          <h2 id="prochain" className="title-display mt-1 text-xl">
            {next.title}
          </h2>
          <p className="mt-1 text-base">
            À rendre : <strong>{dueLabel(dateOfEvaluation(next, frise), next.time)}</strong>
            {next.whereToSubmit ? ` · ${next.whereToSubmit}` : ""}
          </p>
          {reminder(dateOfEvaluation(next, frise), today) ? (
            <p className="font-semibold">{reminder(dateOfEvaluation(next, frise), today)}</p>
          ) : null}
          <p className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`${base}/evaluation/${nextIndex + 1}`}
              className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-lg px-4 font-semibold focus-visible:ring-2 focus-visible:outline-none"
            >
              Voir le sujet
            </Link>
            {next.grid ? (
              <Link
                href={`${base}/evaluation/${nextIndex + 1}#grille`}
                className="hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold focus-visible:ring-2 focus-visible:outline-none"
              >
                Voir la grille
              </Link>
            ) : null}
          </p>
        </section>
      ) : null}

      <section aria-labelledby="frise" className={card}>
        <h2 id="frise" className="sr-only text-sm font-semibold">
          La frise du module
        </h2>
        <FriseProjected frise={frise} embedded />
      </section>

      <section aria-labelledby="acces" className="hidden space-y-3 min-[600px]:block">
        <h2 id="acces" className="text-sm font-semibold">
          Tout le cours au même endroit
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {espace?.courses.length ? (
            <li>
              <Link href={`${base}/cours`} className={tile}>
                <strong>Cours</strong>
                <span className="text-muted-foreground block text-sm">
                  {espace.courses.reduce((n, c) => n + c.resources.length, 0)} fiches
                </span>
              </Link>
            </li>
          ) : null}
          {espace?.brief ? (
            <li>
              <Link href={`${base}/projet`} className={tile}>
                <strong>Projet</strong>
                <span className="text-muted-foreground block text-sm">{espace.brief.title}</span>
              </Link>
            </li>
          ) : null}
          {espace?.evaluations.length ? (
            <li>
              <Link href={`${base}/evaluation`} className={tile}>
                <strong>Évaluations</strong>
                <span className="text-muted-foreground block text-sm">
                  {espace.evaluations.length > 1
                    ? `${espace.evaluations.length} sujets et leurs grilles`
                    : "1 sujet et sa grille"}
                </span>
              </Link>
            </li>
          ) : null}
          <li>
            <Link href={`${base}/notes`} className={tile}>
              <strong>Notes et corrigés</strong>
              <span className="text-muted-foreground block text-sm">
                {results.length
                  ? `${results.length} résultat${results.length > 1 ? "s" : ""} publié${results.length > 1 ? "s" : ""}`
                  : "Rien de publié pour l’instant"}
              </span>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

export function ProjetView({ espace }: { espace: Espace }) {
  if (!espace.brief) return <Empty title="Le projet" text="Le brief n’est pas encore publié." />;
  return (
    <article className="max-w-3xl">
      <h1 className="mb-4">{espace.brief.title}</h1>
      <Markdown source={espace.brief.text} headingLevel={2} />
    </article>
  );
}

export function EvaluationView({
  data,
  index,
  deposit,
}: {
  data: EspaceData;
  index: number;
  /** Zone de dépôt (rendu « dans Marelle »), calculée côté serveur par la page. */
  deposit?: React.ReactNode;
}) {
  const { base, espace, frise } = data;
  const e = espace?.evaluations[index];
  if (!espace || !e) return <Empty title="Évaluations" text="Cette évaluation n’existe pas." />;
  const facts = [
    ["À rendre", dueLabel(dateOfEvaluation(e, frise), e.time)],
    e.sessionNumber ? ["Séance", `Séance ${e.sessionNumber}`] : null,
    e.durationMinutes ? ["Durée", `${e.durationMinutes} min`] : null,
    e.whereToSubmit ? ["Où rendre", e.whereToSubmit] : null,
    // Point d'étape : un retour commenté, jamais le mot « note ».
    kindOf(e.type) === "checkpoint"
      ? [
          "Point d’étape",
          e.groupGrade ? "Retour au groupe, sans note" : "Retour personnel, sans note",
        ]
      : ["Note", e.groupGrade ? "Note de groupe" : "Note individuelle"],
  ].filter((f): f is string[] => f !== null);

  return (
    <div className="max-w-4xl">
      {espace.evaluations.length > 1 ? (
        <nav aria-label="Les évaluations" className="mb-5">
          <ul className="flex flex-wrap gap-2">
            {espace.evaluations.map((x, i) => (
              <li key={i}>
                <Link
                  href={`${base}/evaluation/${i + 1}`}
                  aria-current={i === index ? "page" : undefined}
                  className={`focus-visible:ring-ring inline-flex min-h-11 items-center rounded-lg border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none ${
                    i === index ? "bg-secondary font-semibold" : "hover:bg-accent"
                  }`}
                >
                  {x.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <h1>{e.title}</h1>
      {e.sections.length + (e.grid ? 1 : 0) > 1 ? (
        <nav aria-label="Sur cette page" className="mt-2">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {e.sections.map((x) => (
              <li key={x.heading}>
                <a
                  href={`#s-${x.heading.replace(/\s+/g, "-")}`}
                  className="underline underline-offset-2"
                >
                  {x.heading}
                </a>
              </li>
            ))}
            {e.grid ? (
              <li>
                <a href="#grille" className="underline underline-offset-2">
                  Grille
                </a>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
      {e.type ? <p className="text-muted-foreground mt-1">{e.type}</p> : null}
      {depositStatus(
        e,
        dateOfEvaluation(e, frise),
        data.deposits?.[e.id],
        new Date().toISOString().slice(0, 10),
      ) ? (
        <p role="status" className="bg-muted mt-3 rounded-xl border p-3 text-sm font-medium">
          {depositStatus(
            e,
            dateOfEvaluation(e, frise),
            data.deposits?.[e.id],
            new Date().toISOString().slice(0, 10),
          )}
        </p>
      ) : null}
      <dl className={`${card} mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3`}>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              {label}
            </dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {e.sections.map((s) => (
        <section
          key={s.heading}
          aria-labelledby={`s-${s.heading.replace(/\s+/g, "-")}`}
          className="mt-7"
        >
          <h2 id={`s-${s.heading.replace(/\s+/g, "-")}`} className="mb-2 text-sm font-semibold">
            {s.heading}
          </h2>
          <Markdown source={s.text} headingLevel={3} />
        </section>
      ))}
      {e.documents.length > 0 ? (
        <section aria-labelledby="eval-documents" className="mt-7">
          <h2 id="eval-documents" className="mb-2 text-sm font-semibold">
            Documents à télécharger
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            {e.documents.map((d) => (
              <li key={d.name}>
                <a
                  href={`${base}/evaluation-fichier/${index + 1}/${encodeURIComponent(d.name)}`}
                  className="underline underline-offset-2"
                >
                  Télécharger {d.name.replace(/\.[^.]+$/, "")} ({documentKind(d.name)},{" "}
                  {formatSize(d.size)})
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {deposit}
      {e.grid ? (
        <section aria-labelledby="grille" id="grille" className="mt-9 scroll-mt-6">
          <h2 className="mb-1 text-sm font-semibold">
            <span id="grille-titre">La grille d’évaluation</span>
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            Sur {e.grid.maxScore} points. Chaque critère a un poids et des niveaux.
          </p>
          {e.grid.axes.map((axis, ai) => (
            <div key={ai} className="mb-6">
              {axis.label ? (
                <h3 className="text-sm font-semibold">
                  {axis.label}{" "}
                  <span className="text-muted-foreground text-sm font-semibold">
                    · {pts(axis.points)}
                  </span>
                </h3>
              ) : null}
              <ul className="mt-2 grid gap-3 lg:grid-cols-2">
                {axis.criteria.map((c, ci) => (
                  <li key={ci} className={card}>
                    <p className="font-semibold">
                      {c.label}
                      <span className="sr-only">, </span>
                      <span className="text-muted-foreground ml-2 text-sm font-normal">
                        {pts(c.weight)}
                        {c.bonus ? " · bonus" : ""}
                      </span>
                    </p>
                    {c.levels.length ? (
                      <ul className="mt-2 space-y-1 text-sm">
                        {c.levels.map((l, li) => (
                          <li key={li}>
                            <strong>{pts(l.points)}</strong> : {l.description}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export function CoursListView({ data }: { data: EspaceData }) {
  const courses = data.espace?.courses ?? [];
  if (!courses.length)
    return <Empty title="Cours" text="Aucune fiche n’est publiée pour l’instant." />;
  return (
    <div className="max-w-4xl">
      <h1 className="mb-6">Cours</h1>
      <div className="space-y-8">
        {courses.map((c) => {
          const total = c.resources.reduce((n, r) => n + (r.minutes ?? 0), 0);
          return (
            <section key={c.number} aria-labelledby={`seance-${c.number}`}>
              <h2 id={`seance-${c.number}`} className="mb-2 text-sm font-semibold">
                {sessionHeading(c)}
                {total ? (
                  <span className="text-muted-foreground ml-2 text-sm font-normal">
                    · {formatMinutes(total)}
                  </span>
                ) : null}
              </h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {c.resources.map((r, i) => (
                  <li key={i}>
                    <Link href={`${data.base}/cours/${c.number}/${i + 1}`} className={tile}>
                      <strong>{r.title}</strong>
                      <span className="text-muted-foreground block text-sm">
                        {[r.kindLabel, r.minutes ? formatMinutes(r.minutes) : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Une seule fiche à la fois : sommaire des titres, puis « Précédente / Suivante » entre les fiches. */
export function CoursFicheView({
  data,
  session,
  index,
}: {
  data: EspaceData;
  session: number;
  /** Rang de la fiche dans la séance, à partir de 1. */
  index: number;
}) {
  const course = data.espace?.courses.find((c) => c.number === session);
  const resource = course?.resources[index - 1];
  if (!course || !resource) return <Empty title="Cours" text="Cette fiche n’existe pas." />;

  const flat = flatFiches(data.espace);
  const at = flat.findIndex((f) => f.session === session && f.index === index);
  const prev = at > 0 ? flat[at - 1] : null;
  const next = at >= 0 && at < flat.length - 1 ? flat[at + 1] : null;
  const href = (f: { session: number; index: number }) =>
    `${data.base}/cours/${f.session}/${f.index}`;
  const toc = resource.content ? markdownOutline(resource.content, "fiche") : [];

  /** Une image de la fiche passe par la route protégée du lien, jamais par le bucket. */
  const resolveImage = (src: string) => {
    if (/^(https?:|data:image\/)/i.test(src)) return src;
    const last = src.split(/[?#]/)[0].split("/").pop() ?? "";
    let name = last;
    try {
      name = decodeURIComponent(last);
    } catch {
      /* nom mal encodé : gardé tel quel */
    }
    return `${data.base}/fichier/${session}/${index - 1}/${encodeURIComponent(name)}`;
  };

  return (
    <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-10">
      <article aria-labelledby="fiche-titre" className="max-w-3xl min-w-0">
        <p className="mb-2 text-sm">
          <Link href={`${data.base}/cours`} className="underline underline-offset-2">
            ← Tous les cours
          </Link>
          <span className="text-muted-foreground"> · {sessionHeading(course)}</span>
        </p>
        <h1 id="fiche-titre">{resource.title}</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          {[
            resource.kindLabel,
            resource.minutes ? formatMinutes(resource.minutes) : null,
            `Fiche ${at + 1} sur ${flat.length}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {resource.content ? (
          <Markdown
            source={resource.content}
            headingLevel={2}
            anchorPrefix="fiche"
            resolveImageSrc={resolveImage}
          />
        ) : null}
        {resource.url ? (
          <p className="mt-3">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Ouvrir le lien<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </p>
        ) : null}
        {resource.documents.length > 0 ? (
          <section aria-labelledby="fiche-documents" className="mt-8">
            <h2 id="fiche-documents" className="text-sm font-semibold">
              Documents à télécharger
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {resource.documents.map((d) => (
                <li key={d.name}>
                  <a
                    href={`${data.base}/document/${session}/${index - 1}/${encodeURIComponent(d.name)}`}
                    className="underline underline-offset-2"
                  >
                    Télécharger {d.name.replace(/\.[^.]+$/, "")} ({documentKind(d.name)},{" "}
                    {formatSize(d.size)})
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <nav
          aria-label="Fiches voisines"
          className="mt-10 flex flex-wrap justify-between gap-3 border-t pt-5"
        >
          {prev ? (
            <Link href={href(prev)} className={`${tile} flex-1 basis-60`}>
              <span className="text-muted-foreground block text-xs">← Précédente</span>
              <strong>{prev.title}</strong>
            </Link>
          ) : (
            <span className="flex-1 basis-60" />
          )}
          {next ? (
            <Link href={href(next)} className={`${tile} flex-1 basis-60 text-right`}>
              <span className="text-muted-foreground block text-xs">Suivante →</span>
              <strong>{next.title}</strong>
            </Link>
          ) : null}
        </nav>
      </article>
      {toc.length > 1 ? (
        <>
          <nav aria-label="Sommaire de la fiche" className="order-first mb-4 xl:hidden">
            <details className="bg-card rounded-xl border p-3">
              <summary className="min-h-6 cursor-pointer text-sm font-bold">
                Dans cette fiche
              </summary>
              <ul className="mt-2 space-y-1 text-sm">
                {toc.map((h) => (
                  <li key={h.id} className={h.level === 2 ? "pl-3" : undefined}>
                    <a href={`#${h.id}`} className="inline-block min-h-6 hover:underline">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </nav>
          <nav aria-label="Sommaire de la fiche" className="hidden xl:block">
            <div className="xl:sticky xl:top-6">
              <p className="mb-2 text-sm font-bold">Dans cette fiche</p>
              <ul className="space-y-1 text-sm">
                {toc.map((h) => (
                  <li key={h.id} className={h.level === 2 ? "pl-3" : undefined}>
                    <a
                      href={`#${h.id}`}
                      className="focus-visible:ring-ring inline-block min-h-6 rounded hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export function NotesView({ data }: { data: EspaceData }) {
  if (!data.results.length) {
    return (
      <Empty
        title="Notes et corrigés"
        text="Aucun résultat n’est publié pour l’instant. Tes notes et tes corrigés apparaîtront ici dès que Marie les aura publiés."
      />
    );
  }
  // Le plus récent en premier : seul celui-ci est déplié quand il y en a plusieurs.
  const results = [...data.results].sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
  return (
    <div className="max-w-3xl">
      <h1 className="mb-4">Notes et corrigés</h1>
      {results.length > 1 ? (
        <nav aria-label="Tes résultats" className={`${card} mb-5`}>
          <h2 className="mb-2 text-sm font-semibold">Vue d’ensemble</h2>
          <ul className="divide-y text-sm">
            {results.map(({ sheet }, i) => (
              <li key={i}>
                <a
                  href={`#resultat-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 underline-offset-2 hover:underline"
                >
                  <span className="font-medium">{sheet.title}</span>
                  <span className="font-heading text-lg font-bold">
                    {sheet.value !== null
                      ? `${fmt(sheet.value)} / ${fmt(sheet.maxScore)}`
                      : "Pas de note"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <ul className="space-y-5">
        {results.map(({ sheet, publishedAt }, i) => {
          const feedback = [
            ["Ce qui est réussi", sheet.strengths],
            ["Pour progresser", sheet.progress],
            ["Commentaire", sheet.feedback],
            ["Un mot pour toi", sheet.personalNote],
          ].filter(([, text]) => text?.trim());
          return (
            <li key={i} id={`resultat-${i}`} className={`${card} scroll-mt-4`}>
              <details open={i === 0} className="group/result">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <div>
                    <h2 className="text-sm font-semibold">{sheet.title}</h2>
                    <p className="text-muted-foreground text-sm">
                      {[
                        sheet.date ? new Date(sheet.date).toLocaleDateString("fr-FR") : null,
                        sheet.isGroupGrade ? "Note de groupe" : "Note individuelle",
                        publishedAt
                          ? `publié le ${new Date(publishedAt).toLocaleDateString("fr-FR")}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>

                    {sheet.value !== null ? (
                      <p className="bg-muted mt-2 inline-flex items-baseline gap-1 rounded-xl px-4 py-2">
                        <span className="font-heading text-5xl font-bold">{fmt(sheet.value)}</span>
                        <span className="text-foreground/80 text-xl font-semibold">
                          / {fmt(sheet.maxScore)}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-2 text-xl font-bold">Pas de note</p>
                    )}
                  </div>
                  <span className="text-muted-foreground text-sm">
                    <span className="group-open/result:hidden">Voir le détail ▾</span>
                    <span className="hidden group-open/result:inline">Masquer ▴</span>
                  </span>
                </summary>
                <div className="mt-3">
                  <a
                    href={`${data.base}/pdf/${i + 1}`}
                    className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-lg px-4 font-semibold focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Télécharger mon PDF
                  </a>
                  {feedback.length ? (
                    <dl className="mt-4 space-y-3 text-base">
                      {feedback.map(([label, text]) => (
                        <div
                          key={label}
                          className={
                            label === "Ce qui est réussi"
                              ? "border-status-ready bg-muted rounded-xl border p-4"
                              : label === "Pour progresser"
                                ? "border-status-todo bg-muted rounded-xl border p-4"
                                : "bg-muted/30 rounded-xl border p-4"
                          }
                        >
                          <dt className="font-heading mb-1 text-lg font-bold">{label}</dt>
                          <dd className="leading-relaxed">
                            <Markdown source={text ?? ""} headingLevel={4} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {sheet.attendance === "present" && sheet.criteria.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <h3 className="text-sm font-semibold">Détail par critère</h3>
                      {sheet.axes.some((a) => a.comment) ? (
                        <ul className="space-y-1 text-base">
                          {sheet.axes
                            .filter((a) => a.comment)
                            .map((a) => (
                              <li key={a.label ?? "autres"}>
                                <strong>{a.label ?? "Autres critères"}</strong> : {a.comment}
                              </li>
                            ))}
                        </ul>
                      ) : null}
                      <ul className="space-y-4 text-base">
                        {sheet.criteria.map((c, ci) => (
                          <li
                            key={c.label + ci}
                            className="bg-background space-y-3 rounded-xl border p-4"
                          >
                            <p className="flex flex-wrap items-center justify-between gap-2">
                              <strong className="font-heading text-lg">
                                {c.axis ? `${c.axis} · ` : ""}
                                {c.label}
                              </strong>
                              <span className="bg-muted rounded-full px-3 py-1 font-bold">
                                {c.points === null
                                  ? "Critère non évalué"
                                  : `${fmt(c.points)} / ${fmt(c.max)}`}
                                {c.isBonus ? " (bonus)" : ""}
                              </span>
                            </p>
                            {c.points !== null && c.max > 0 ? (
                              <div
                                className="bg-muted h-2 overflow-hidden rounded-full"
                                aria-hidden="true"
                              >
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${Math.min(100, (c.points / c.max) * 100)}%` }}
                                />
                              </div>
                            ) : null}
                            {c.levels?.length ? (
                              <CriterionLevels levels={c.levels} />
                            ) : c.level?.description ? (
                              <p className="text-base leading-relaxed">
                                <span className="font-semibold">Palier obtenu : </span>
                                {c.level.description}
                              </p>
                            ) : null}
                            {c.comment ? (
                              <div className="border-primary/60 border-l-4 pl-4 text-base leading-relaxed">
                                <Markdown source={c.comment} headingLevel={4} />
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {sheet.comments.length > 0 ? (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold">Commentaires</h3>
                      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                        {sheet.comments.map((c, ci) => (
                          <li key={ci}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="max-w-2xl space-y-2">
      <h1>{title}</h1>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

export function EvaluationsListView({ data }: { data: EspaceData }) {
  const { base, espace, frise } = data;
  const today = new Date().toISOString().slice(0, 10);
  if (!espace?.evaluations.length) {
    return <Empty title="Évaluations" text="Aucune évaluation n’est publiée pour l’instant." />;
  }
  return (
    <div className="max-w-3xl">
      <h1 className="mb-4">Évaluations</h1>
      <ul className="space-y-3">
        {espace.evaluations.map((e, i) => {
          const due = dateOfEvaluation(e, frise);
          const dep = data.deposits?.[e.id];
          const publishedNote = data.results.some((r) => r.sheet.title === e.title);
          const status = isNoDepositEvaluation(e)
            ? null
            : e.graded || publishedNote
              ? "noté"
              : dep
                ? dep.late > 0
                  ? "rendu en retard"
                  : "rendu"
                : e.submit.mode === "app"
                  ? due && due < today
                    ? "pas encore rendu"
                    : "à rendre"
                  : due && due < today
                    ? "rendu"
                    : "à rendre";
          return (
            <li key={i}>
              <Link href={`${base}/evaluation/${i + 1}`} className={tile}>
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong>{e.title}</strong>
                  {status ? (
                    <span className="bg-muted rounded-full px-3 py-0.5 text-sm font-semibold">
                      {status}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground block text-sm">
                  {e.groupGrade ? "Note de groupe" : "Note individuelle"} · {dueLabel(due, e.time)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
