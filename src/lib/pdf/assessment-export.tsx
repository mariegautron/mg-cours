import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ProjectContext, QcmPlan, QcmTheme } from "@/lib/assessments/export";
import { dueLabel } from "@/lib/modules/espace";
import { formatNumber } from "@/lib/assessments/scoring";
import { MarkdownPdf } from "@/lib/pdf/markdown-view";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#111", lineHeight: 1.4 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sub: { color: "#555", marginBottom: 12 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4 },
  criterion: { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  head: { flexDirection: "row", justifyContent: "space-between" },
  label: { flex: 1, paddingRight: 8, fontFamily: "Helvetica-Bold" },
  level: { flexDirection: "row", marginTop: 2, paddingLeft: 8, fontSize: 10 },
  levelPoints: { width: 44, fontFamily: "Helvetica-Bold" },
  ref: { color: "#555", fontSize: 9, marginTop: 2 },
});

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null;

interface Context {
  moduleName: string;
  title: string;
  type: string | null;
  date: string | null;
  durationMinutes: number | null;
  teacherName: string;
  /** Modalités : où rendre, heure (rendu ou passage), note de groupe ou individuelle. */
  whereToSubmit?: string | null;
  time?: string | null;
  groupGrade?: boolean;
}

const subtitle = (c: Context, what: string) =>
  [
    what,
    c.moduleName,
    c.type,
    fmtDate(c.date),
    c.durationMinutes ? `${c.durationMinutes} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/** Sujet remis aux étudiant·es : objectif, consigne, rendu attendu, ce qui est évalué. */
export function SubjectDocument({
  context,
  sections,
  plan,
}: {
  context: Context;
  sections: { heading: string; text: string }[];
  /** Déroulement du QCM (durée, thèmes, barème) : jamais les questions. */
  plan?: QcmPlan | null;
}) {
  return (
    <Document title={`Sujet — ${context.title}`} author={context.teacherName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{context.title}</Text>
        <Text style={styles.sub}>{subtitle(context, "Sujet")}</Text>
        <View style={styles.criterion}>
          <Text style={styles.h2}>Modalités</Text>
          {[
            context.date
              ? `Échéance ou date : ${dueLabel(context.date, context.time ?? null)}`
              : null,
            context.durationMinutes ? `Durée : ${context.durationMinutes} min` : null,
            context.whereToSubmit ? `Où rendre : ${context.whereToSubmit}` : null,
            context.groupGrade === undefined
              ? null
              : context.groupGrade
                ? "Note de groupe"
                : "Note individuelle",
          ]
            .filter(Boolean)
            .map((line) => (
              <Text key={line}>{line}</Text>
            ))}
        </View>
        {sections.map((s) => (
          <View key={s.heading}>
            <Text style={styles.h2}>{s.heading}</Text>
            <MarkdownPdf source={s.text} />
          </View>
        ))}
        {plan ? (
          <View>
            <Text style={styles.h2} minPresenceAhead={80}>
              Déroulement du QCM
            </Text>
            {plan.durationMinutes ? <Text>Durée : {plan.durationMinutes} min</Text> : null}
            {plan.instructions ? <MarkdownPdf source={plan.instructions} /> : null}
            {plan.themes.length ? (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.label}>Thèmes tirés au sort</Text>
                {plan.themes.map((t) => (
                  <Text key={t.label}>
                    {"• "}
                    {t.label} — {t.count} question{t.count > 1 ? "s" : ""},{" "}
                    {formatNumber(t.pointsEach)} pt
                    {t.pointsEach > 1 ? "s" : ""} chacune ({formatNumber(t.count * t.pointsEach)} pt
                    {t.count * t.pointsEach > 1 ? "s" : ""})
                  </Text>
                ))}
                <Text style={{ marginTop: 3 }}>
                  Total : {formatNumber(plan.totalPoints)} points
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

/** Correction type du QCM : par thème, chaque question avec ses bonnes réponses et son corrigé. */
export function QcmCorrectionDocument({
  context,
  themes,
}: {
  context: Context;
  themes: QcmTheme[];
}) {
  return (
    <Document title={`Correction type — ${context.title}`} author={context.teacherName}>
      {/* Une page de départ par thème : le moteur PDF se dérègle quand une seule page s'étale trop. */}
      {themes.map((theme, t) => (
        <Page key={theme.label} size="A4" style={styles.page}>
          {t === 0 ? (
            <>
              <Text style={styles.title}>{context.title}</Text>
              <Text style={styles.sub}>{subtitle(context, "Correction type")}</Text>
            </>
          ) : null}
          <View>
            <Text style={styles.h2} minPresenceAhead={80}>
              {theme.label}
            </Text>
            {theme.questions.map((q, i) => (
              <View key={q.id} style={styles.criterion}>
                <Text style={styles.label} minPresenceAhead={80}>
                  {i + 1}. {q.name}
                </Text>
                <MarkdownPdf source={q.statement} />
                {q.type === "numerical" && q.numericValue !== null ? (
                  <Text style={styles.level}>
                    Réponse attendue : {formatNumber(q.numericValue)}
                    {q.numericTolerance ? ` (à ± ${formatNumber(q.numericTolerance)} près)` : ""}
                  </Text>
                ) : (
                  q.choices.map((c, j) => (
                    <View key={j} style={styles.level}>
                      <Text style={styles.levelPoints}>{c.fraction > 0 ? "Juste" : "Faux"}</Text>
                      <Text style={{ flex: 1 }}>
                        {c.text}
                        {c.feedback ? ` — ${c.feedback}` : ""}
                      </Text>
                    </View>
                  ))
                )}
                {q.generalFeedback ? (
                  <View style={{ marginTop: 3 }}>
                    <Text style={styles.ref}>
                      {q.choices.length ? "Corrigé" : "Réponse attendue"}
                    </Text>
                    <MarkdownPdf source={q.generalFeedback} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}

/** Contexte du projet, commun au jalon et à l'oral : l'école comprend ainsi d'où viennent les sujets. */
export function ProjectContextDocument({
  context,
  project,
}: {
  context: Context;
  project: ProjectContext;
}) {
  return (
    <Document title={`Contexte du projet — ${project.title}`} author={context.teacherName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.sub}>{["Contexte du projet", context.moduleName].join(" · ")}</Text>
        {project.briefMd ? (
          <View>
            <Text style={styles.h2}>Brief du client</Text>
            <MarkdownPdf source={project.briefMd} />
          </View>
        ) : null}
        {project.clientContextMd ? (
          <View>
            <Text style={styles.h2}>Contexte du client</Text>
            <MarkdownPdf source={project.clientContextMd} />
          </View>
        ) : null}
        {project.milestones.length ? (
          <View>
            <Text style={styles.h2} minPresenceAhead={60}>
              Jalons du projet
            </Text>
            {project.milestones.map((m) => (
              <Text key={m.title} style={{ marginBottom: 2 }}>
                {"• "}
                {m.title}
                {m.sessionNumber ? ` — séance ${m.sessionNumber}` : ""}
                {m.date ? `, ${dueLabel(m.date, m.time)}` : ""}
              </Text>
            ))}
          </View>
        ) : null}
        {project.mails.length ? (
          <View>
            <Text style={styles.h2} minPresenceAhead={60}>
              Mails du client
            </Text>
            {project.mails.map((mail, i) => (
              <View key={i} style={styles.criterion} wrap={false}>
                <Text style={styles.label}>
                  {mail.title}
                  {mail.sessionNumber ? ` — envoyé en séance ${mail.sessionNumber}` : ""}
                  {mail.date ? ` (${dueLabel(mail.date, null)})` : ""}
                </Text>
                <MarkdownPdf source={mail.body} />
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
