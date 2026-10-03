import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ResultCriterionLine, ResultSheet } from "@/lib/assessments/results";
import { formatNumber } from "@/lib/assessments/scoring";
import { MarkdownPdf } from "@/lib/pdf/markdown-view";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#111" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sub: { color: "#555", marginBottom: 14 },
  who: { fontSize: 12, marginBottom: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f3f3f3",
  },
  criterion: { flex: 1, paddingRight: 8 },
  notice: { marginBottom: 8, padding: 6, backgroundColor: "#f3f3f3" },
  ref: { color: "#555", fontSize: 9 },
  level: { color: "#333", fontSize: 10, marginTop: 2 },
  gridLevel: { color: "#555", fontSize: 8, marginTop: 1 },
  comment: { fontSize: 10, marginTop: 2, fontFamily: "Helvetica-Oblique" },
  overflow: { marginTop: 2, color: "#555" },
  total: { marginTop: 10, fontSize: 14, fontFamily: "Helvetica-Bold" },
  h: { fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 3 },
});

/** Points d'un critère : « 4 / 6 », « +0,5 » pour un bonus, « validé d'office » sinon. */
function criterionPoints(c: ResultCriterionLine): string {
  const points = c.points === null ? "—" : formatNumber(c.points);
  if (c.isBonus) return `${points} (bonus, max +${formatNumber(c.max)})`;
  return `${points} / ${formatNumber(c.max)}${c.autoValidated ? " (validé d’office)" : ""}`;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null;

function axisSubtotal(sheet: ResultSheet, label: string | null): string {
  const a = sheet.axes.find((x) => x.label === label);
  if (!a) return "";
  const bonus = a.bonusMax > 0 ? ` + ${formatNumber(a.bonusPoints)} de bonus` : "";
  return `${formatNumber(a.points)} / ${formatNumber(a.max)}${bonus}`;
}

export function ResultsDocument({ sheets }: { sheets: ResultSheet[] }) {
  return (
    <Document title={`Résultats — ${sheets[0]?.title ?? ""}`}>
      {sheets.map((s, i) => {
        const hasAxes = s.axes.some((a) => a.label);
        return (
          <Page key={i} size="A4" style={styles.page}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.sub}>
              {[s.moduleName, fmtDate(s.date)].filter(Boolean).join(" · ")}
            </Text>
            <Text style={styles.who}>
              {s.isGroupGrade ? "Groupe : " : ""}
              {s.recipients.map((r) => r.name).join(", ")}
            </Text>
            {s.theme ? <Text style={styles.sub}>Thème du projet : {s.theme}</Text> : null}

            {s.subject ? (
              <View>
                <Text style={styles.h}>Sujet</Text>
                <MarkdownPdf source={s.subject} />
              </View>
            ) : null}

            {s.attendance === "absent_excused" && s.value === null ? (
              <Text style={styles.notice}>
                Votre absence est excusée : vous n’avez pas de note pour cette évaluation. Votre
                note sera celle du rattrapage.
              </Text>
            ) : null}
            {s.attendance === "absent_excused" && s.value !== null ? (
              <Text style={styles.notice}>
                Votre absence est excusée : vous gardez la note du groupe (règle de l’école).
              </Text>
            ) : null}
            {s.attendance === "absent_unexcused" ? (
              <Text style={styles.notice}>
                Absence non prévenue : la note est de 0 (règle de l’école).
              </Text>
            ) : null}
            {s.personalNote ? (
              <View style={styles.notice}>
                <Text>Un mot pour vous : {s.personalNote}</Text>
              </View>
            ) : null}

            {(s.attendance === "present" ? s.criteria : []).map((c, j) => (
              <View key={c.label + j}>
                {hasAxes && (j === 0 || c.axis !== s.criteria[j - 1].axis) ? (
                  <View style={styles.axis}>
                    <Text>{c.axis ?? "Autres critères"}</Text>
                    <Text>{axisSubtotal(s, c.axis)}</Text>
                  </View>
                ) : null}
                {hasAxes && (j === 0 || c.axis !== s.criteria[j - 1].axis)
                  ? (() => {
                      const axisNote = s.axes.find((x) => x.label === c.axis)?.comment;
                      return axisNote ? <Text style={styles.comment}>{axisNote}</Text> : null;
                    })()
                  : null}
                <View style={styles.row} wrap={false}>
                  <View style={styles.criterion}>
                    <Text>{c.label}</Text>
                    {c.reference ? <Text style={styles.ref}>Référence : {c.reference}</Text> : null}
                    {c.level?.description ? (
                      <Text style={styles.level}>Palier obtenu : {c.level.description}</Text>
                    ) : null}
                    {c.comment ? <Text style={styles.comment}>{c.comment}</Text> : null}
                    {c.levels.length > 1
                      ? c.levels.map((l) => (
                          <Text key={l.points} style={styles.gridLevel}>
                            {l.obtained ? "> " : "  "}
                            {formatNumber(l.points)} pt{l.points > 1 ? "s" : ""}
                            {l.description ? ` : ${l.description}` : ""}
                            {l.obtained ? " (obtenu)" : ""}
                          </Text>
                        ))
                      : null}
                  </View>
                  <Text>{criterionPoints(c)}</Text>
                </View>
              </View>
            ))}

            {s.attendance === "absent_excused" ? null : (
              <Text style={styles.total}>
                Note : {s.value ?? "—"} / {s.maxScore}
                {s.maxScore !== 20 && s.valueOn20 !== null ? ` (soit ${s.valueOn20}/20)` : ""}
              </Text>
            )}
            {s.overflow ? (
              <Text style={styles.overflow}>Total avec bonus : {s.overflow}</Text>
            ) : null}

            {s.strengths ? (
              <View>
                <Text style={styles.h}>Vos points forts</Text>
                <Text>{s.strengths}</Text>
              </View>
            ) : null}
            {s.progress ? (
              <View>
                <Text style={styles.h}>Vos progrès</Text>
                <Text>{s.progress}</Text>
              </View>
            ) : null}
            {s.feedback ? (
              <View>
                <Text style={styles.h}>Commentaire</Text>
                <Text>{s.feedback}</Text>
              </View>
            ) : null}
            {s.comments.length > 0 ? (
              <View>
                <Text style={styles.h}>Commentaires</Text>
                {s.comments.map((c, j) => (
                  <Text key={j}>- {c}</Text>
                ))}
              </View>
            ) : null}
          </Page>
        );
      })}
    </Document>
  );
}
