import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ResultSheet } from "@/lib/assessments/results";

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
  total: { marginTop: 10, fontSize: 14, fontFamily: "Helvetica-Bold" },
  h: { fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 3 },
});

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null;

export function ResultsDocument({ sheets }: { sheets: ResultSheet[] }) {
  return (
    <Document title={`Résultats — ${sheets[0]?.title ?? ""}`}>
      {sheets.map((s, i) => (
        <Page key={i} size="A4" style={styles.page}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.sub}>
            {[s.moduleName, s.subjectName, fmtDate(s.date)].filter(Boolean).join(" · ")}
          </Text>
          <Text style={styles.who}>
            {s.isGroupGrade ? "Groupe : " : ""}
            {s.recipients.map((r) => r.name).join(", ")}
          </Text>

          {s.criteria.map((c) => (
            <View key={c.label} style={styles.row}>
              <Text>{c.label}</Text>
              <Text>
                {c.points ?? "—"} / {c.max}
              </Text>
            </View>
          ))}

          <Text style={styles.total}>
            Note : {s.value ?? "—"}
            {s.maxScore ? ` / ${s.maxScore}` : ""}
          </Text>

          {s.feedback ? (
            <View>
              <Text style={styles.h}>Appréciation</Text>
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
      ))}
    </Document>
  );
}
