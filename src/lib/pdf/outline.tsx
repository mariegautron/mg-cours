import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { calculateDuration, formatDuration } from "@/lib/modules/course-duration";
import { MarkdownPdf } from "@/lib/pdf/markdown-view";
import type { OutlineContent } from "@/lib/ynov/outline";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 14, textAlign: "center" },
  headerRow: { flexDirection: "row", marginBottom: 3 },
  label: { width: 170, fontFamily: "Helvetica-Bold" },
  value: { flex: 1 },
  session: { marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#999" },
  sessionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  phase: { color: "#555", marginBottom: 4 },
  h: { fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 2 },
  bullet: { marginLeft: 8, marginBottom: 1 },
  muted: { color: "#555" },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#555",
  },
});

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "—";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** Rubrique de la trame : le titre reste avec le début de son contenu. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.h}>{title}</Text>
      {children}
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
      {content.sessions.map((s, idx) => {
        const duration = calculateDuration(s.startTime ?? null, s.endTime ?? null);
        const when = [
          s.sessionDate ? fmt(s.sessionDate) : null,
          s.startTime ? `${s.startTime}${s.endTime ? `–${s.endTime}` : ""}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <Page key={s.number} size="A4" style={styles.page}>
            {idx === 0 ? (
              <>
                <Text style={styles.title}>PROGRESSION PÉDAGOGIQUE</Text>
                <Field label="Nom et prénom du formateur" value={content.teacherName || "—"} />
                <Field label="Nom de la matière" value={content.moduleName} />
                {content.ycode ? <Field label="YCODE" value={content.ycode} /> : null}
                <Field label="Niveau" value={content.level ?? "—"} />
                {content.schoolName ? <Field label="École" value={content.schoolName} /> : null}
                <Field label="Année scolaire" value={content.schoolYear ?? String(content.year)} />
                <Field
                  label="Nombre d’heures"
                  value={`${content.totalHours} h${hours ? ` (${hours})` : ""}`}
                />
              </>
            ) : null}
            <View style={styles.session}>
              <Text style={styles.sessionTitle}>SEANCE n°{s.number}</Text>
              <Text style={styles.phase}>Phase de face à face intervenant</Text>
              <Section title="Titre de la séance">
                <Text>{s.title}</Text>
                {when ? (
                  <Text style={styles.muted}>
                    {when}
                    {duration ? ` (${formatDuration(duration)})` : ""}
                  </Text>
                ) : null}
              </Section>
              {s.objectives.length ? (
                <Section title="Objectifs et compétences à acquérir">
                  {s.objectives.map((o, i) => (
                    <Text key={i} style={styles.bullet}>
                      {"- "}
                      {o}
                    </Text>
                  ))}
                </Section>
              ) : null}
              {s.animation ? (
                <Section title="Modalités d’animation">
                  <MarkdownPdf source={s.animation} />
                </Section>
              ) : null}
              {s.assessment ? (
                <Section title="Modalités d’évaluation">
                  <MarkdownPdf source={s.assessment} />
                </Section>
              ) : null}
              {s.material ? (
                <Section title="Matériel nécessaire">
                  <MarkdownPdf source={s.material} />
                </Section>
              ) : null}
            </View>
            <View style={styles.footer} fixed>
              <Text>Mise à jour le {fmt(content.generatedAt)}</Text>
              <Text
                render={({ pageNumber, totalPages }) => `Page ${pageNumber} sur ${totalPages}`}
              />
            </View>
          </Page>
        );
      })}

      {/* Une page de départ par séance : le moteur PDF se dérègle quand une seule page s'étale trop. */}
    </Document>
  );
}
