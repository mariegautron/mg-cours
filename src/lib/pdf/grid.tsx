import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { GridHandout, HandoutCriterion } from "@/lib/assessments/grid-handout";
import { formatNumber } from "@/lib/assessments/scoring";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#111" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sub: { color: "#555", marginBottom: 6 },
  intro: { marginBottom: 10 },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f3f3f3",
  },
  criterion: { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  head: { flexDirection: "row", justifyContent: "space-between" },
  label: { flex: 1, paddingRight: 8, fontFamily: "Helvetica-Bold" },
  desc: { marginTop: 2 },
  ref: { color: "#555", fontSize: 9, marginTop: 2 },
  level: { flexDirection: "row", marginTop: 2, paddingLeft: 8, fontSize: 10 },
  levelPoints: { width: 44, fontFamily: "Helvetica-Bold" },
  total: { marginTop: 12, fontSize: 13, fontFamily: "Helvetica-Bold" },
  note: { marginTop: 4, color: "#555", fontSize: 9 },
});

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null;

const pts = (n: number) => `${formatNumber(n)} pt${n > 1 ? "s" : ""}`;

function Criterion({ c }: { c: HandoutCriterion }) {
  return (
    <View style={styles.criterion} wrap={false}>
      <View style={styles.head}>
        <Text style={styles.label}>
          {c.label}
          {c.isBonus ? " (bonus)" : ""}
        </Text>
        <Text>{c.isBonus ? `jusqu’à +${formatNumber(c.max)}` : pts(c.max)}</Text>
      </View>
      {c.description ? <Text style={styles.desc}>{c.description}</Text> : null}
      {c.reference ? <Text style={styles.ref}>Référence : {c.reference}</Text> : null}
      {c.levels.map((l) => (
        <View key={l.points} style={styles.level}>
          <Text style={styles.levelPoints}>{pts(l.points)}</Text>
          <Text style={{ flex: 1 }}>{l.description}</Text>
        </View>
      ))}
    </View>
  );
}

/** Grille de correction remise aux étudiant·es : aucune note, aucun commentaire (US-91). */
export function GridHandoutDocument({ handout }: { handout: GridHandout }) {
  const { context } = handout;
  return (
    <Document title={`Grille d’évaluation — ${context?.assessmentTitle ?? handout.gridName}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{context?.assessmentTitle ?? handout.gridName}</Text>
        <Text style={styles.sub}>
          {[
            "Grille d’évaluation",
            context?.moduleName,
            fmtDate(context?.date ?? null),
            context?.durationMinutes ? `${context.durationMinutes} min` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {context ? <Text style={styles.sub}>Grille : {handout.gridName}</Text> : null}
        {handout.description ? <Text style={styles.intro}>{handout.description}</Text> : null}

        {handout.axes.map((axis, i) => (
          <View key={axis.label ?? `none-${i}`}>
            {handout.hasAxes ? (
              <View style={styles.axis}>
                <Text>{axis.label ?? "Autres critères"}</Text>
                <Text>
                  {pts(axis.max)}
                  {axis.bonusMax > 0 ? ` + bonus jusqu’à ${formatNumber(axis.bonusMax)}` : ""}
                </Text>
              </View>
            ) : null}
            {axis.criteria.map((c) => (
              <Criterion key={c.label} c={c} />
            ))}
          </View>
        ))}

        <Text style={styles.total}>Barème : {formatNumber(handout.maxScore)} points</Text>
        {handout.bonusMax > 0 ? (
          <Text style={styles.note}>
            Les bonus s’ajoutent au total, dans la limite de 20 sur 20.
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
