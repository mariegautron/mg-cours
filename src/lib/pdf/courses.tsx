import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { MarkdownPdf, type ImageMap } from "@/lib/pdf/markdown-view";

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
  /** Images de la fiche (nom de fichier → URI de données), chargées par la route. */
  images?: ImageMap;
}

export interface ExportCourse {
  number: number;
  title: string;
  sessionDate: string | null;
  objectives: string[];
  material: string | null;
  /** Dernière modification des fiches de la séance (ISO). */
  updatedAt?: string | null;
  resources: ExportResource[];
}

export interface ExportModule {
  name: string;
  ycode: string | null;
  schoolName: string | null;
  level: string | null;
  year: number;
  /** « 2026-2027 » ; à défaut, l'année du module. */
  schoolYear?: string;
  teacherName: string;
}

const cover = StyleSheet.create({
  page: { padding: 60, fontFamily: "Helvetica", color: "#111", justifyContent: "center" },
  kicker: { fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 28, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 6 },
  sub: { fontSize: 15, color: "#333", marginBottom: 36 },
  row: { flexDirection: "row", marginBottom: 8, fontSize: 12 },
  label: { width: 190, fontFamily: "Helvetica-Bold" },
  value: { flex: 1 },
});

/** Couverture d'un support de cours : matière, année scolaire, enseignante, classe, mise à jour. */
function CoverPage({
  mod,
  subtitle,
  updatedAt,
}: {
  mod: ExportModule;
  subtitle: string | null;
  updatedAt: string | null | undefined;
}) {
  const rows: [string, string | null][] = [
    ["Intitulé de la matière", mod.name],
    ["Année scolaire", mod.schoolYear ?? String(mod.year)],
    ["Nom et prénom de l’enseignante", mod.teacherName || null],
    ["Groupe / classe", mod.level],
    ["Dernière mise à jour", fmt(updatedAt ?? null)],
  ];
  return (
    <Page size="A4" style={cover.page}>
      <Text style={cover.kicker}>Support de cours</Text>
      <Text style={cover.title}>{mod.name}</Text>
      <Text style={cover.sub}>{subtitle ?? " "}</Text>
      {rows.map(([label, value]) =>
        value ? (
          <View key={label} style={cover.row}>
            <Text style={cover.label}>{label}</Text>
            <Text style={cover.value}>{value}</Text>
          </View>
        ) : null,
      )}
    </Page>
  );
}

/**
 * Une séance = une section par fiche. Le moteur PDF plante (« unsupported number ») quand une seule
 * page logique s'étale sur trop de pages : chaque fiche a donc sa propre page de départ.
 * Destiné aux étudiants (sans notes d'animation ni d'évaluation).
 */
function CoursePages({ mod, course }: { mod: ExportModule; course: ExportCourse }) {
  const date = fmt(course.sessionDate);
  const footer = (
    <Text
      style={styles.footer}
      fixed
      render={({ pageNumber, totalPages }) =>
        `${mod.name} — Séance ${course.number} — page ${pageNumber}/${totalPages}`
      }
    />
  );
  const resourceView = (r: ExportResource, i: number) => (
    <View key={i} style={styles.resource}>
      <Text style={styles.resourceTitle}>{r.title}</Text>
      {r.description ? <Text style={[styles.p, styles.muted]}>{r.description}</Text> : null}
      {r.url ? <Text style={[styles.p, styles.muted]}>{r.url}</Text> : null}
      {r.content ? <MarkdownPdf source={r.content} images={r.images} /> : null}
    </View>
  );
  return (
    <>
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
          {[date, mod.level, String(mod.year), mod.teacherName || null]
            .filter(Boolean)
            .join(" · ")}
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

        {course.resources.slice(0, 1).map(resourceView)}
        {footer}
      </Page>
      {course.resources.slice(1).map((r, i) => (
        <Page key={i} size="A4" style={styles.page}>
          {resourceView(r, i)}
          {footer}
        </Page>
      ))}
    </>
  );
}

/** PDF d'une seule séance. */
export function CourseDocument({ mod, course }: { mod: ExportModule; course: ExportCourse }) {
  return (
    <Document title={`${mod.name} — Séance ${course.number}`} author={mod.teacherName}>
      <CoverPage
        mod={mod}
        subtitle={`Séance ${course.number} — ${course.title}`}
        updatedAt={course.updatedAt}
      />
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
      <CoverPage
        mod={mod}
        subtitle={`${courses.length} séance${courses.length > 1 ? "s" : ""}`}
        updatedAt={courses
          .map((c) => c.updatedAt ?? "")
          .sort()
          .at(-1)}
      />
      {courses.map((c) => (
        <CoursePages key={c.number} mod={mod} course={c} />
      ))}
    </Document>
  );
}
