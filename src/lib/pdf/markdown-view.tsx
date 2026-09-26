import { StyleSheet, Text, View } from "@react-pdf/renderer";

import { parseMarkdown, type Block, type InlineRun } from "@/lib/pdf/markdown";

const styles = StyleSheet.create({
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
});

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
          {r.href ? `${r.text} (${r.href})` : r.text}
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
    case "image":
      return <Text style={styles.p}>[Image{block.alt ? ` : ${block.alt}` : ""}]</Text>;
    case "quote":
      return (
        <Text style={[styles.p, styles.quote]}>
          <Runs runs={block.runs} />
        </Text>
      );
  }
}

/** Texte Markdown (ressources, sujets d'évaluation) rendu en blocs PDF. */
export function MarkdownPdf({ source }: { source: string }) {
  return (
    <>
      {parseMarkdown(source).map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </>
  );
}
