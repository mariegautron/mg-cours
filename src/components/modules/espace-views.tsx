import Link from "next/link";

import { Markdown, markdownOutline } from "@/components/markdown";
import { FriseProjected } from "@/components/modules/frise-view";
import { formatMinutes } from "@/lib/modules/activity";
import {
  dueLabel,
  flatFiches,
  nextEvaluationIndex,
  quizIsOpen,
  type Espace,
  type EspaceEvaluation,
} from "@/lib/modules/espace";
import { sessionHeading, type Frise } from "@/lib/modules/frise";
import type { PublicSheet } from "@/lib/result-links/sheet";

/**
 * Tableau de bord du cours (espace étudiant·e, desktop d'abord) : menu à gauche, contenu à droite.
 * Les étudiant·es sont vouvoyé·es. Aucune donnée privée : tout vient de l'instantané publié.
 */
export interface EspaceData {
  /** Préfixe des adresses (`/espace/<jeton>`). */
  base: string;
  firstName: string | null;
  frise: Frise;
  espace: Espace | null;
  results: { sheet: PublicSheet; publishedAt: string | null }[];
  publishedAt: string | null;
}

export type EspaceSection = "accueil" | "cours" | "projet" | "evaluation" | "notes";

const card = "bg-card rounded-2xl border p-5 shadow-sm";
const tile =
  "bg-card hover:bg-accent focus-visible:ring-ring block rounded-2xl border p-5 shadow-sm focus-visible:ring-2 focus-visible:outline-none";

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
    { key: "cours", label: "Cours", href: `${base}/cours`, show: !!espace?.courses.length },
    { key: "projet", label: "Projet", href: `${base}/projet`, show: !!espace?.brief },
    {
      key: "evaluation",
      label: "Évaluations",
      href: `${base}/evaluation/1`,
      show: !!espace?.evaluations.length,
    },
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
      <aside className="border-b p-4 lg:border-r lg:border-b-0 lg:p-6">
        <div className="lg:sticky lg:top-6">
          <p className="text-primary text-xs font-bold tracking-widest uppercase">
            Espace étudiant·e
          </p>
          <p className="font-heading mt-1 text-lg leading-tight font-bold">{frise.moduleName}</p>
          <nav aria-label="Espace étudiant·e" className="mt-4">
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {items
                .filter((i) => i.show)
                .map((i) => (
                  <li key={i.key}>
                    <Link
                      href={i.href}
                      aria-current={i.key === current ? "page" : undefined}
                      className={`focus-visible:ring-ring flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none ${
                        i.key === current ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      }`}
                    >
                      {i.label}
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
      <main id="contenu" tabIndex={-1} className="min-w-0 p-4 outline-none lg:p-10">
        {children}
      </main>
    </div>
  );
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
  const nextIndex = nextEvaluationIndex(espace, frise, today);
  const next = nextIndex !== null ? espace!.evaluations[nextIndex] : null;
  const quizOpen = quizIsOpen(espace?.quiz ?? null);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        Bonjour{firstName ? ` ${firstName}` : ""}
      </h1>

      {quizOpen && espace?.quiz ? (
        <section
          aria-labelledby="quiz"
          className="border-primary bg-primary/10 rounded-2xl border-2 p-5"
        >
          <h2 id="quiz" className="font-heading text-xl font-bold">
            Votre évaluation individuelle est ouverte
          </h2>
          <p className="mt-1">
            {espace.quiz.title}
            {espace.quiz.closesAt
              ? ` · jusqu’au ${new Date(espace.quiz.closesAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" })}`
              : ""}
          </p>
          {espace.quiz.url ? (
            <a
              href={espace.quiz.url}
              className="bg-primary text-primary-foreground focus-visible:ring-ring mt-3 inline-flex min-h-11 items-center rounded-lg px-4 font-semibold focus-visible:ring-2 focus-visible:outline-none"
            >
              Passer le QCM
            </a>
          ) : (
            <p className="text-muted-foreground mt-2 text-sm">
              Utilisez le lien du QCM qui vous a été donné en classe.
            </p>
          )}
        </section>
      ) : null}

      {next && nextIndex !== null ? (
        <section aria-labelledby="prochain" className="bg-card rounded-2xl border-2 p-6 shadow-sm">
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Prochain rendu</p>
          <h2 id="prochain" className="font-heading mt-1 text-2xl font-bold">
            {next.title}
          </h2>
          <p className="mt-1 text-lg">
            À rendre : <strong>{dueLabel(dateOfEvaluation(next, frise), next.time)}</strong>
            {next.whereToSubmit ? ` · ${next.whereToSubmit}` : ""}
          </p>
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
        <h2 id="frise" className="sr-only">
          La frise du module
        </h2>
        <FriseProjected frise={frise} embedded />
      </section>

      <section aria-labelledby="acces" className="space-y-3">
        <h2 id="acces" className="font-heading text-xl font-bold">
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
              <Link href={`${base}/evaluation/1`} className={tile}>
                <strong>Évaluations</strong>
                <span className="text-muted-foreground block text-sm">
                  {espace.evaluations.length} sujet{espace.evaluations.length > 1 ? "s" : ""} et
                  grilles
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
      <h1 className="font-heading mb-4 text-3xl font-bold">{espace.brief.title}</h1>
      <Markdown source={espace.brief.text} headingLevel={2} />
    </article>
  );
}

export function EvaluationView({ data, index }: { data: EspaceData; index: number }) {
  const { base, espace, frise } = data;
  const e = espace?.evaluations[index];
  if (!espace || !e) return <Empty title="Évaluations" text="Cette évaluation n’existe pas." />;
  const facts = [
    ["À rendre", dueLabel(dateOfEvaluation(e, frise), e.time)],
    e.sessionNumber ? ["Séance", `Séance ${e.sessionNumber}`] : null,
    e.durationMinutes ? ["Durée", `${e.durationMinutes} min`] : null,
    e.whereToSubmit ? ["Où rendre", e.whereToSubmit] : null,
    ["Note", e.groupGrade ? "Note de groupe" : "Note individuelle"],
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
      <h1 className="font-heading text-3xl font-bold">{e.title}</h1>
      {e.type ? <p className="text-muted-foreground mt-1">{e.type}</p> : null}
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
        <section key={s.heading} aria-labelledby={`s-${s.heading}`} className="mt-7">
          <h2 id={`s-${s.heading}`} className="font-heading mb-2 text-xl font-bold">
            {s.heading}
          </h2>
          <Markdown source={s.text} headingLevel={3} />
        </section>
      ))}
      {e.grid ? (
        <section aria-labelledby="grille" id="grille" className="mt-9 scroll-mt-6">
          <h2 className="font-heading mb-1 text-xl font-bold">
            <span id="grille-titre">La grille d’évaluation</span>
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            Sur {e.grid.maxScore} points. Chaque critère a un poids et des niveaux.
          </p>
          {e.grid.axes.map((axis, ai) => (
            <div key={ai} className="mb-6">
              {axis.label ? (
                <h3 className="font-heading text-lg font-bold">
                  {axis.label}{" "}
                  <span className="text-muted-foreground text-sm font-semibold">
                    · {axis.points} point{axis.points > 1 ? "s" : ""}
                  </span>
                </h3>
              ) : null}
              <ul className="mt-2 grid gap-3 lg:grid-cols-2">
                {axis.criteria.map((c, ci) => (
                  <li key={ci} className={card}>
                    <p className="font-semibold">
                      {c.label}
                      <span className="text-muted-foreground ml-2 text-sm font-normal">
                        {c.weight} point{c.weight > 1 ? "s" : ""}
                        {c.bonus ? " · bonus" : ""}
                      </span>
                    </p>
                    {c.levels.length ? (
                      <ul className="mt-2 space-y-1 text-sm">
                        {c.levels.map((l, li) => (
                          <li key={li}>
                            <strong>
                              {l.points} pt{l.points > 1 ? "s" : ""}
                            </strong>{" "}
                            : {l.description}
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
      <h1 className="font-heading mb-6 text-3xl font-bold">Cours</h1>
      <div className="space-y-8">
        {courses.map((c) => {
          const total = c.resources.reduce((n, r) => n + (r.minutes ?? 0), 0);
          return (
            <section key={c.number} aria-labelledby={`seance-${c.number}`}>
              <h2 id={`seance-${c.number}`} className="font-heading mb-2 text-xl font-bold">
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
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-10">
      <article aria-labelledby="fiche-titre" className="max-w-3xl min-w-0">
        <p className="mb-2 text-sm">
          <Link href={`${data.base}/cours`} className="underline underline-offset-2">
            ← Tous les cours
          </Link>
          <span className="text-muted-foreground"> · {sessionHeading(course)}</span>
        </p>
        <h1 id="fiche-titre" className="font-heading text-3xl font-bold">
          {resource.title}
        </h1>
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
        <nav aria-label="Sommaire de la fiche" className="mt-8 xl:mt-0">
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
        text="Aucun résultat n’est publié pour l’instant. Vos notes et vos corrigés apparaîtront ici dès que votre enseignante les aura publiés."
      />
    );
  }
  return (
    <div className="max-w-3xl">
      <h1 className="font-heading mb-4 text-3xl font-bold">Notes et corrigés</h1>
      <ul className="space-y-5">
        {data.results.map(({ sheet, publishedAt }, i) => {
          const feedback = [
            ["Ce qui est réussi", sheet.strengths],
            ["Pour progresser", sheet.progress],
            ["Commentaire", sheet.feedback],
            ["Un mot pour vous", sheet.personalNote],
          ].filter(([, text]) => text?.trim());
          return (
            <li key={i} className={card}>
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
              <h2 className="font-heading text-xl font-bold">{sheet.title}</h2>
              <p className="mt-1 text-2xl font-bold">
                {sheet.value !== null
                  ? `${fmt(sheet.value)} / ${fmt(sheet.maxScore)}`
                  : "Pas de note"}
              </p>
              {feedback.length ? (
                <dl className="mt-3 space-y-2 text-sm">
                  {feedback.map(([label, text]) => (
                    <div key={label}>
                      <dt className="font-medium">{label}</dt>
                      <dd className="whitespace-pre-wrap">{text}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
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
      <h1 className="font-heading text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
