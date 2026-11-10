import { Pill } from "@/components/dashboard/pill";
import { Markdown } from "@/components/markdown";
import { CriterionLevels } from "@/components/results/criterion-levels";
import type { PublicSheet } from "@/lib/result-links/sheet";

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/**
 * Résultat d'UNE personne, tel que la personne le reçoit (vouvoiement, sans carnet ni notes
 * privées). Partagé par la page publique et l'aperçu « Voir comme l'étudiant·e » (`token: null` :
 * pas de lien de PDF).
 */
export function StudentResult({ sheet, token }: { sheet: PublicSheet; token: string | null }) {
  const me = sheet.recipients[0];
  const absentExcusedNoNote = sheet.attendance === "absent_excused" && sheet.value === null;
  const notice = "bg-card rounded-xl border p-4 text-sm";
  const feedback = [
    ["Ce qui est réussi", sheet.strengths],
    ["Pour progresser", sheet.progress],
    ["Commentaire", sheet.feedback],
  ].filter(([, text]) => text?.trim());
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[3fr_2fr] lg:items-start">
      <section
        aria-labelledby="res"
        className="bg-card min-w-0 space-y-3 rounded-2xl border p-6 lg:col-start-1 lg:row-span-2 lg:row-start-1"
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
            {sheet.makeupTitle
              ? `Ton absence est excusée : ta note est celle du rattrapage (« ${sheet.makeupTitle} »).`
              : "Ton absence est excusée : tu gardes la note du groupe (règle de l’école)."}
          </p>
        ) : null}
        {absentExcusedNoNote ? (
          <p className={notice}>
            Ton absence est excusée : tu n’as pas de note pour cette évaluation. Ta note sera celle
            du rattrapage.
          </p>
        ) : null}
        {sheet.personalNote ? (
          <div className={notice}>
            <h2 className="font-medium">Un mot pour toi</h2>
            <Markdown source={sheet.personalNote} headingLevel={3} />
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
                      {c.points === null
                        ? "Critère non évalué"
                        : `${fmt(c.points)} / ${fmt(c.max)}`}
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
                  {c.questions?.length ? (
                    <ul className="space-y-2">
                      {c.questions.map((q) => (
                        <li key={q.position} className="bg-muted/30 space-y-1 rounded-xl p-3">
                          <p className="font-medium">
                            Question {q.position} · {fmt(q.points)} / {fmt(q.max)}
                          </p>
                          {q.comment ? (
                            <div className="text-base leading-relaxed">
                              <Markdown source={q.comment} headingLevel={4} />
                            </div>
                          ) : null}
                          {q.statement ? (
                            <details className="text-sm">
                              <summary className="cursor-pointer">Revoir la question</summary>
                              <div className="mt-1 whitespace-pre-wrap">{q.statement}</div>
                            </details>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {c.comment && !c.questions?.length ? (
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

      {absentExcusedNoNote ? null : (
        <section
          aria-labelledby="note"
          className="bg-primary/10 border-primary/50 order-first rounded-2xl border p-6 lg:order-none lg:col-start-2 lg:row-start-1"
        >
          <h2 id="note" className="font-heading mb-1 font-bold">
            Ta note
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
      <section
        aria-labelledby="dl"
        className="bg-card space-y-2 rounded-2xl border p-5 lg:col-start-2 lg:row-start-2"
      >
        <h2 id="dl" className="font-heading font-bold">
          Garder une trace
        </h2>
        <a
          href={token ? `/resultats/${token}/pdf` : "#"}
          aria-disabled={token ? undefined : true}
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md px-4 font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Télécharger mon PDF
        </a>
        <p className="text-muted-foreground text-sm">
          Ce lien est personnel : tu ne vois que ton résultat. Une question sur ta note ? Vois-la
          avec Marie au prochain cours.
        </p>
      </section>
    </div>
  );
}
