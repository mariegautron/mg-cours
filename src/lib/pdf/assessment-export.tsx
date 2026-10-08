import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { BankQuestion } from "@/lib/quiz/types";
import type { HandoutCriterion } from "@/lib/assessments/grid-handout";
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

const pts = (n: number) => `${formatNumber(n)} pt${n > 1 ? "s" : ""}`;

interface Context {
  moduleName: string;
  title: string;
  type: string | null;
  date: string | null;
  durationMinutes: number | null;
  teacherName: string;
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
}: {
  context: Context;
  sections: { heading: string; text: string }[];
}) {
  return (
    <Document title={`Sujet — ${context.title}`} author={context.teacherName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{context.title}</Text>
        <Text style={styles.sub}>{subtitle(context, "Sujet")}</Text>
        {sections.map((s) => (
          <View key={s.heading}>
            <Text style={styles.h2}>{s.heading}</Text>
            <MarkdownPdf source={s.text} />
          </View>
        ))}
      </Page>
    </Document>
  );
}

/** Correction type : pour chaque critère, le barème, les attendus et la référence ; jamais de note. */
export function CorrectionDocument({
  context,
  criteria,
}: {
  context: Context;
  criteria: HandoutCriterion[];
}) {
  return (
    <Document title={`Correction type — ${context.title}`} author={context.teacherName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{context.title}</Text>
        <Text style={styles.sub}>{subtitle(context, "Correction type")}</Text>
        {criteria.map((c) => (
          <View key={c.label} style={styles.criterion} wrap={false}>
            <View style={styles.head}>
              <Text style={styles.label}>
                {c.label}
                {c.isBonus ? " (bonus)" : ""}
              </Text>
              <Text>{c.isBonus ? `jusqu’à +${formatNumber(c.max)}` : pts(c.max)}</Text>
            </View>
            {c.description ? <MarkdownPdf source={c.description} /> : null}
            {c.reference ? <Text style={styles.ref}>Référence : {c.reference}</Text> : null}
            {c.levels.map((l) => (
              <View key={l.points} style={styles.level}>
                <Text style={styles.levelPoints}>{pts(l.points)}</Text>
                <Text style={{ flex: 1 }}>{l.description}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

/** Correction type du QCM : énoncé, bonnes réponses, retour de chaque choix et retour général. */
export function QcmCorrectionDocument({
  context,
  questions,
}: {
  context: Context;
  questions: BankQuestion[];
}) {
  return (
    <Document title={`Correction du QCM — ${context.title}`} author={context.teacherName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{context.title}</Text>
        <Text style={styles.sub}>{subtitle(context, "Correction type du QCM")}</Text>
        {questions.map((q, i) => (
          <View key={q.id} style={styles.criterion} wrap={false}>
            <Text style={styles.label}>
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
            {q.generalFeedback ? <Text style={styles.ref}>{q.generalFeedback}</Text> : null}
          </View>
        ))}
      </Page>
    </Document>
  );
}
