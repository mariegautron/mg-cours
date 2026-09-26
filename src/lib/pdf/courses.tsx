import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { MarkdownPdf } from "@/lib/pdf/markdown-view";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111", lineHeight: 1.4 },
  kicker: { fontSize: 9, color: "#555", marginBottom: 4 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { color: "#555", marginBottom: 10 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4 },
  resource: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#bbb" },
  resourceTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  p: { marginBottom: 5 },
  li: { flexDirection: "row", marginBottom: 2, marginLeft: 6 },
  bullet: { width: 14 },
  muted: { color: "#555" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 8, color: "#777" },
});

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null;

export interface ExportResource {
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
}

export interface ExportCourse {
  number: number;
  title: string;
  sessionDate: string | null;
  objectives: string[];
  material: string | null;
  resources: ExportResource[];
}

export interface ExportModule {
  name: string;
  ycode: string | null;
  schoolName: string | null;
  level: string | null;
  year: number;
  teacherName: string;
}

/** Une séance = une ou plusieurs pages ; destiné aux étudiants (sans notes d'animation ni d'évaluation). */
function CoursePages({ mod, course }: { mod: ExportModule; course: ExportCourse }) {
  const date = fmt(course.sessionDate);
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.kicker}>
        {mod.name}
        {mod.ycode ? ` · ${mod.ycode}` : ""}
        {mod.schoolName ? ` · ${mod.schoolName}` : ""}
      </Text>
      <Text style={styles.title}>
        Séance {course.number} — {course.title}
      </Text>
      <Text style={styles.meta}>
        {[date, mod.level, String(mod.year), mod.teacherName || null].filter(Boolean).join(" · ")}
      </Text>

      {course.objectives.length ? (
        <View>
          <Text style={styles.h2}>Objectifs</Text>
          {course.objectives.map((o, i) => (
            <View key={i} style={styles.li} wrap={false}>
              <Text style={styles.bullet}>•</Text>
              <Text style={{ flex: 1 }}>{o}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {course.material ? (
        <View>
          <Text style={styles.h2}>Matériel nécessaire</Text>
          <Text>{course.material}</Text>
        </View>
      ) : null}

      {course.resources.map((r, i) => (
        <View key={i} style={styles.resource}>
          <Text style={styles.resourceTitle}>{r.title}</Text>
          {r.description ? <Text style={[styles.p, styles.muted]}>{r.description}</Text> : null}
          {r.url ? <Text style={[styles.p, styles.muted]}>{r.url}</Text> : null}
          {r.content ? <MarkdownPdf source={r.content} /> : null}
        </View>
      ))}

      <Text
        style={styles.footer}
        fixed
        render={({ pageNumber, totalPages }) =>
          `${mod.name} — Séance ${course.number} — page ${pageNumber}/${totalPages}`
        }
      />
    </Page>
  );
}

/** PDF d'une seule séance. */
export function CourseDocument({ mod, course }: { mod: ExportModule; course: ExportCourse }) {
  return (
    <Document title={`${mod.name} — Séance ${course.number}`} author={mod.teacherName}>
      <CoursePages mod={mod} course={course} />
    </Document>
  );
}

/** PDF unique regroupant toutes les séances du module. */
export function ModuleCoursesDocument({
  mod,
  courses,
}: {
  mod: ExportModule;
  courses: ExportCourse[];
}) {
  return (
    <Document title={`${mod.name} — Cours`} author={mod.teacherName}>
      {courses.map((c) => (
        <CoursePages key={c.number} mod={mod} course={c} />
      ))}
    </Document>
  );
}
