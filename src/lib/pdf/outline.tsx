import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { OutlineContent } from "@/lib/ynov/outline";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  headerRow: { flexDirection: "row", marginBottom: 3 },
  label: { width: 150, fontFamily: "Helvetica-Bold" },
  session: { marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#999" },
  sessionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h: { fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 2 },
  bullet: { marginLeft: 8, marginBottom: 1 },
  muted: { color: "#555" },
});

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "—";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.label}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function Block({ title, lines }: { title: string; lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <View>
      <Text style={styles.h}>{title}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={styles.bullet}>
          {"- "}
          {l}
        </Text>
      ))}
    </View>
  );
}

export function OutlineDocument({ content }: { content: OutlineContent }) {
  const hours = [
    content.hoursLecture != null ? `FFP ${content.hoursLecture} h` : null,
    content.hoursTd != null ? `TDP ${content.hoursTd} h` : null,
    content.hoursTp != null ? `TP ${content.hoursTp} h` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document
      title={`Progression pédagogique — ${content.moduleName}`}
      author={content.teacherName}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>PROGRESSION PÉDAGOGIQUE</Text>
        <Field label="Formateur·rice" value={content.teacherName || "—"} />
        <Field label="Matière" value={content.moduleName} />
        {content.ycode ? <Field label="YCODE" value={content.ycode} /> : null}
        <Field label="Niveau" value={content.level ?? "—"} />
        {content.schoolName ? <Field label="École" value={content.schoolName} /> : null}
        <Field label="Année" value={String(content.year)} />
        <Field
          label="Nombre d’heures"
          value={`${content.totalHours} h${hours ? ` (${hours})` : ""}`}
        />
        <Field label="Date de dernière MAJ" value={fmt(content.generatedAt)} />

        {content.sessions.map((s) => (
          <View key={s.number} style={styles.session} wrap={false}>
            <Text style={styles.sessionTitle}>
              SÉANCE N°{s.number} — {s.title}
            </Text>
            <Text style={styles.muted}>
              {s.typeLabel}
              {s.sessionDate ? ` · ${fmt(s.sessionDate)}` : ""} · contenu mis à jour le{" "}
              {fmt(s.contentLastUpdatedAt)}
            </Text>
            <Block title="Objectifs et compétences à acquérir" lines={s.objectives} />
            <Block title="Modalités d’animation" lines={s.animation ? [s.animation] : []} />
            <Block title="Modalités d’évaluation" lines={s.assessment ? [s.assessment] : []} />
            <Block title="Ressources" lines={s.resources} />
            <Block title="Matériel nécessaire" lines={s.material ? [s.material] : []} />
          </View>
        ))}
      </Page>
    </Document>
  );
}
