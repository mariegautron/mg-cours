import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { parseMarkdown, type Block, type InlineRun } from "@/lib/pdf/markdown";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111", lineHeight: 1.4 },
  kicker: { fontSize: 9, color: "#555", marginBottom: 4 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { color: "#555", marginBottom: 10 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4 },
  resource: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#bbb" },
  resourceTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 3 },
  h3: { fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 2 },
  p: { marginBottom: 5 },
  li: { flexDirection: "row", marginBottom: 2, marginLeft: 6 },
  bullet: { width: 14 },
  code: {
    fontFamily: "Courier",
    fontSize: 9,
    backgroundColor: "#f1f1f1",
    padding: 6,
    marginBottom: 5,
  },
  quote: {
    marginLeft: 8,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#999",
    color: "#444",
  },
  muted: { color: "#555" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 8, color: "#777" },
});

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null;

function Runs({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
            fontFamily: r.code
              ? "Courier"
              : r.bold
                ? "Helvetica-Bold"
                : r.italic
                  ? "Helvetica-Oblique"
                  : "Helvetica",
          }}
        >
          {r.text}
        </Text>
      ))}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return (
        <Text style={block.level === 3 ? styles.h3 : styles.h1}>
          <Runs runs={block.runs} />
        </Text>
      );
    case "paragraph":
      return (
        <Text style={styles.p}>
          <Runs runs={block.runs} />
        </Text>
      );
    case "list":
      return (
        <View>
          {block.items.map((item, i) => (
            <View key={i} style={styles.li} wrap={false}>
              <Text style={styles.bullet}>{block.ordered ? `${i + 1}.` : "•"}</Text>
              <Text style={{ flex: 1 }}>
                <Runs runs={item} />
              </Text>
            </View>
          ))}
        </View>
      );
    case "code":
      return <Text style={styles.code}>{block.text}</Text>;
    case "quote":
      return (
        <Text style={[styles.p, styles.quote]}>
          <Runs runs={block.runs} />
        </Text>
      );
  }
}

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
          {r.content
            ? parseMarkdown(r.content).map((b, j) => <BlockView key={j} block={b} />)
            : null}
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
