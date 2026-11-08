import type { Metadata } from "next";

import { Pill } from "@/components/dashboard/pill";
import { Markdown } from "@/components/markdown";
import { CriterionLevels } from "@/components/results/criterion-levels";
import {
  INVALID_LINK_TEXT,
  INVALID_LINK_TITLE,
  THROTTLED_TEXT,
  THROTTLED_TITLE,
  UNAVAILABLE_TEXT,
  UNAVAILABLE_TITLE,
} from "@/lib/student-messages";
import { callResult } from "@/lib/result-links/public";
import type { PublicSheet } from "@/lib/result-links/sheet";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mon résultat",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children ? <p className="text-muted-foreground">{children}</p> : null}
    </section>
  );
}

function Result({ sheet, token }: { sheet: PublicSheet; token: string }) {
  const me = sheet.recipients[0];
  const absentExcusedNoNote = sheet.attendance === "absent_excused" && sheet.value === null;
  const notice = "bg-card rounded-xl border p-4 text-sm";
  const feedback = [
    ["Ce qui est réussi", sheet.strengths],
    ["Pour progresser", sheet.progress],
    ["Commentaire", sheet.feedback],
  ].filter(([, text]) => text?.trim());
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <section
        aria-labelledby="res"
        className="bg-card min-w-0 flex-[3_1_0] space-y-3 rounded-2xl border p-6"
      >
        <p className="text-muted-foreground text-sm">
          {[
            sheet.title,
            sheet.theme ? `thème ${sheet.theme}` : null,
            sheet.date ? new Date(sheet.date).toLocaleDateString("fr-FR") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <h1 id="res" className="font-heading text-3xl font-bold tracking-tight">
          {sheet.isGroupGrade ? "Note de groupe pour " : "Résultat de "}
          {me.name}
        </h1>

        {sheet.attendance === "absent_unexcused" ? (
          <p className={notice}>Absence non prévenue : la note est de 0 (règle de l’école).</p>
        ) : null}
        {sheet.attendance === "absent_excused" && sheet.value !== null ? (
          <p className={notice}>
            Votre absence est excusée : vous gardez la note du groupe (règle de l’école).
          </p>
        ) : null}
        {absentExcusedNoNote ? (
          <p className={notice}>
            Votre absence est excusée : vous n’avez pas de note pour cette évaluation. Votre note
            sera celle du rattrapage.
          </p>
        ) : null}
        {sheet.personalNote ? (
          <div className={notice}>
            <h2 className="font-medium">Un mot pour vous</h2>
            <Markdown source={sheet.personalNote} headingLevel={3} />
          </div>
        ) : null}

        {sheet.attendance === "present" && sheet.criteria.length > 0 ? (
          <div aria-labelledby="detail" role="group">
            <h2 id="detail" className="sr-only">
              Détail par critère
            </h2>
            {sheet.axes.some((a) => a.comment) ? (
              <ul className="mb-2 space-y-2">
                {sheet.axes
                  .filter((a) => a.comment)
                  .map((a) => (
                    <li key={a.label ?? "autres"} className="text-sm">
                      <strong>{a.label ?? "Autres critères"}</strong> : {a.comment}
                    </li>
                  ))}
              </ul>
            ) : null}
            <ul className="space-y-4">
              {sheet.criteria.map((c, i) => (
                <li key={c.label + i} className="bg-background space-y-3 rounded-2xl border p-4">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <strong>
                      {c.axis ? `${c.axis} · ` : ""}
                      {c.label}
                    </strong>
                    <Pill tone={c.points === null ? "warn" : "ok"}>
                      {c.points === null ? "Critère non évalué" : `${fmt(c.points)} / ${fmt(c.max)}`}
                      {c.isBonus ? " (bonus)" : ""}
                    </Pill>
                  </p>
                  {c.points !== null && c.max > 0 ? (
                    <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
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

        {feedback.length > 0 ? (
          <div className="space-y-2 pt-1">
            {feedback.map(([heading, text]) => (
              <div key={heading}>
                <h2 className="font-heading text-lg font-bold">{heading}</h2>
                <div className="text-base leading-relaxed">
                  <Markdown source={text ?? ""} headingLevel={3} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {sheet.comments.length > 0 ? (
          <div>
            <h2 className="font-semibold">Commentaires</h2>
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              {sheet.comments.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="min-w-0 flex-[2_1_0] space-y-4">
        {absentExcusedNoNote ? null : (
          <section
            aria-labelledby="note"
            className="bg-primary/10 border-primary/50 rounded-2xl border p-6"
          >
            <h2 id="note" className="font-heading mb-1 font-bold">
              Votre note
            </h2>
            <p className="font-heading text-5xl font-bold">
              {sheet.value === null ? "—" : fmt(sheet.value)}{" "}
              <span className="text-muted-foreground text-xl font-normal">
                / {fmt(sheet.maxScore)}
              </span>
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {sheet.isGroupGrade ? "Note de groupe. " : ""}
              {sheet.maxScore !== 20 && sheet.valueOn20 !== null
                ? `Soit ${fmt(sheet.valueOn20)} / 20. `
                : ""}
              {sheet.overflow ? `Total avec bonus : ${sheet.overflow}. ` : ""}
              {sheet.bonusLine ?? ""}
            </p>
          </section>
        )}
        <section aria-labelledby="dl" className="bg-card space-y-2 rounded-2xl border p-5">
          <h2 id="dl" className="font-heading font-bold">
            Garder une trace
          </h2>
          <a
            href={`/resultats/${token}/pdf`}
            className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md px-4 font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Télécharger mon PDF
          </a>
          <p className="text-muted-foreground text-sm">
            Ce lien est personnel : vous ne voyez que votre résultat. Une question sur votre note ?
            Voyez-la avec votre intervenante au prochain cours.
          </p>
        </section>
      </div>
    </div>
  );
}

/** Résultats d'UNE personne par lien personnel (US-147) : aucune connexion, aucune navigation vers l'appli. */
export default async function PublicResultPage({ params }: PageProps<"/resultats/[token]">) {
  const { token } = await params;
  const result = await callResult(token);

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 space-y-5 p-4 sm:p-6">
      {result.status === "ok" ? (
        <p className="text-muted-foreground text-sm">
          <strong className="text-foreground font-heading text-base">Espace étudiant·e</strong>
          {" › "}
          {result.sheet.moduleName}
          {" › "}
          Mon résultat
        </p>
      ) : null}
      {result.status === "ok" ? (
        <Result sheet={result.sheet} token={token} />
      ) : result.status === "throttled" ? (
        <Message title={THROTTLED_TITLE}>
          Trop de liens invalides ont été essayés depuis votre connexion. {THROTTLED_TEXT}
        </Message>
      ) : result.status === "unavailable" ? (
        <Message title={UNAVAILABLE_TITLE}>{UNAVAILABLE_TEXT}</Message>
      ) : (
<Message title={INVALID_LINK_TITLE}>{INVALID_LINK_TEXT}</Message>
      )}
    </main>
  );
}
