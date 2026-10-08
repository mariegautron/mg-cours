import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { parseMarkdown, type Block, type InlineRun, type ListBlock } from "@/lib/pdf/markdown";

/** Nom de fichier → image en URI de données (voir `src/lib/pdf/images.ts`, serveur). */
export type ImageMap = Record<string, string>;

/** Nom de fichier visé par une image Markdown (dernier segment, décodé). */
function imageName(src: string): string {
  const last = src.split(/[?#]/)[0].split("/").pop() ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

const styles = StyleSheet.create({
  figure: { marginVertical: 6, alignItems: "center" },
  figureImage: { maxWidth: "100%", maxHeight: 300, objectFit: "contain" },
  caption: { marginTop: 3, fontSize: 8.5, color: "#555", textAlign: "center" },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 3 },
  h2: { fontSize: 12.5, fontFamily: "Helvetica-Bold", marginTop: 7, marginBottom: 3 },
  h3: { fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 2 },
  h4: { fontFamily: "Helvetica-Bold", fontSize: 9.5, marginTop: 5, marginBottom: 2 },
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
  hr: { borderTopWidth: 1, borderTopColor: "#ccc", marginVertical: 8 },
  callout: {
    marginBottom: 5,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#999",
    backgroundColor: "#f6f6f6",
  },
  table: { marginBottom: 5, borderWidth: 1, borderColor: "#ccc" },
  tr: { flexDirection: "row" },
  th: {
    flex: 1,
    padding: 4,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#eee",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  td: { flex: 1, padding: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#ccc" },
});

const HEADING_STYLE = {
  1: styles.h1,
  2: styles.h2,
  3: styles.h3,
  4: styles.h4,
  5: styles.h4,
  6: styles.h4,
} as const;

function Runs({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((r, i) =>
        "break" in r ? (
          <Text key={i}>{"\n"}</Text>
        ) : (
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
        ),
      )}
    </>
  );
}

function ListItemsView({ block, depth }: { block: ListBlock; depth: number }) {
  return (
    <View>
      {block.items.map((item, i) => (
        <View key={i}>
          <View style={[styles.li, { marginLeft: 6 + depth * 12 }]} wrap={false}>
            <Text style={styles.bullet}>
              {item.checked !== null
                ? item.checked
                  ? "☑"
                  : "☐"
                : block.ordered
                  ? `${i + 1}.`
                  : "•"}
            </Text>
            <Text style={{ flex: 1 }}>
              <Runs runs={item.runs} />
            </Text>
          </View>
          {item.children.map((child, j) => (
            <ListItemsView key={j} block={child} depth={depth + 1} />
          ))}
        </View>
      ))}
    </View>
  );
}

function BlockView({ block, images }: { block: Block; images?: ImageMap }) {
  switch (block.type) {
    case "heading":
      return (
        <Text style={HEADING_STYLE[block.level]}>
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
      return <ListItemsView block={block} depth={0} />;
    case "code":
      return <Text style={styles.code}>{block.text}</Text>;
    case "image": {
      const src = images?.[imageName(block.src)];
      if (!src) return <Text style={styles.p}>[Image{block.alt ? ` : ${block.alt}` : ""}]</Text>;
      return (
        <View style={styles.figure} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- composant PDF : la légende ci-dessous porte le texte alternatif */}
          <Image src={src} style={styles.figureImage} />
          {block.alt ? <Text style={styles.caption}>{block.alt}</Text> : null}
        </View>
      );
    }
    case "quote":
      return (
        <Text style={[styles.p, styles.quote]}>
          <Runs runs={block.runs} />
        </Text>
      );
    case "hr":
      return <View style={styles.hr} />;
    case "table":
      return (
        <View style={styles.table} wrap={false}>
          <View style={styles.tr}>
            {block.header.map((cell, i) => (
              <View key={i} style={styles.th}>
                <Text>
                  <Runs runs={cell} />
                </Text>
              </View>
            ))}
          </View>
          {block.rows.map((row, i) => (
            <View key={i} style={styles.tr}>
              {row.map((cell, j) => (
                <View key={j} style={styles.td}>
                  <Text>
                    <Runs runs={cell} />
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case "callout":
      return (
        <View style={styles.callout}>
          {block.blocks.map((b, i) => (
            <BlockView key={i} block={b} images={images} />
          ))}
        </View>
      );
  }
}

/** Texte Markdown (ressources, sujets d'évaluation) rendu en blocs PDF. */
export function MarkdownPdf({ source, images }: { source: string; images?: ImageMap }) {
  return (
    <>
      {parseMarkdown(source).map((b, i) => (
        <BlockView key={i} block={b} images={images} />
      ))}
    </>
  );
}
