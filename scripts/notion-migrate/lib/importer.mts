// Écriture idempotente : chaque ligne créée est tracée dans `import_ref` (source, id source,
// table). Une ligne déjà importée n'est jamais modifiée ni recréée — les retouches faites
// dans l'app sont préservées. En simulation (par défaut), rien n'est écrit.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Source = "notion" | "moodle";

export interface ReportLine {
  table: string;
  action: "créer" | "déjà importé" | "lier" | "délier" | "envoyer" | "compléter";
  label: string;
}

export class Importer {
  readonly sb: SupabaseClient;
  readonly ownerId: string;
  readonly apply: boolean;
  readonly report: ReportLine[] = [];
  readonly warnings: string[] = [];
  private refTableMissing = false;
  private dryCounter = 0;

  constructor(sb: SupabaseClient, ownerId: string, apply: boolean) {
    this.sb = sb;
    this.ownerId = ownerId;
    this.apply = apply;
  }

  isDry(id: string): boolean {
    return id.startsWith("dry:");
  }

  async findRef(source: Source, sourceId: string, table: string): Promise<string | null> {
    if (this.refTableMissing) return null;
    const { data, error } = await this.sb
      .from("import_ref")
      .select("target_id")
      .eq("owner_id", this.ownerId)
      .eq("source", source)
      .eq("source_id", sourceId)
      .eq("target_table", table)
      .maybeSingle();
    if (error) {
      if (!this.apply && /import_ref/.test(error.message)) {
        this.refTableMissing = true;
        this.warnings.push(
          "Table import_ref absente sur la base : migration 20260926160000_import_ref.sql à appliquer avant l'écriture (simulation : tout est considéré comme « à créer »).",
        );
        return null;
      }
      throw new Error(`import_ref : ${error.message}`);
    }
    return data?.target_id ?? null;
  }

  /** Crée la ligne si elle n'a jamais été importée ; renvoie son id (fictif en simulation). */
  async ensure(
    table: string,
    source: Source,
    sourceId: string,
    row: Record<string, unknown>,
    label: string,
  ): Promise<string> {
    const existing = await this.findRef(source, sourceId, table);
    if (existing) {
      this.report.push({ table, action: "déjà importé", label });
      return existing;
    }
    this.report.push({ table, action: "créer", label });
    if (!this.apply) return `dry:${table}:${++this.dryCounter}`;

    const { data, error } = await this.sb
      .from(table)
      .insert({ ...row, owner_id: this.ownerId })
      .select("id")
      .single();
    if (error) throw new Error(`${table} « ${label} » : ${error.message}`);
    const { error: refError } = await this.sb.from("import_ref").insert({
      owner_id: this.ownerId,
      source,
      source_id: sourceId,
      target_table: table,
      target_id: data.id,
    });
    if (refError) throw new Error(`import_ref (${table} « ${label} ») : ${refError.message}`);
    return data.id as string;
  }

  /** Table de liaison à clé unique (course_resource, group_member) : insert idempotent. */
  async link(table: string, row: Record<string, unknown>, onConflict: string, label: string) {
    this.report.push({ table, action: "lier", label });
    if (!this.apply || Object.values(row).some((v) => typeof v === "string" && this.isDry(v)))
      return;
    const { error } = await this.sb
      .from(table)
      .upsert({ ...row, owner_id: this.ownerId }, { onConflict, ignoreDuplicates: true });
    if (error) throw new Error(`${table} « ${label} » : ${error.message}`);
  }

  /** Envoie un fichier dans un bucket Storage (écriture uniquement). */
  async upload(bucket: string, path: string, body: Buffer, contentType: string) {
    if (!this.apply) return;
    const { error } = await this.sb.storage.from(bucket).upload(path, body, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`Envoi « ${path} » (${bucket}) : ${error.message}`);
  }

  /** Complète une ligne existante (écriture uniquement, jamais sur un id fictif). */
  async update(table: string, id: string, row: Record<string, unknown>, label: string) {
    if (!this.apply || this.isDry(id)) return;
    const { error } = await this.sb
      .from(table)
      .update(row)
      .eq("id", id)
      .eq("owner_id", this.ownerId);
    if (error) throw new Error(`${table} « ${label} » : ${error.message}`);
  }

  /**
   * Corrige une liaison posée par erreur lors d'un import précédent (ex. étudiant·e rangé·e
   * dans le mauvais groupe). N'agit que si la liaison existe.
   */
  async unlink(table: string, match: Record<string, string | undefined>, label: string) {
    const values = Object.values(match);
    if (values.some((v) => !v || this.isDry(v))) return;
    let query = this.sb.from(table).select("id").eq("owner_id", this.ownerId);
    for (const [k, v] of Object.entries(match)) query = query.eq(k, v as string);
    const { data, error } = await query;
    if (error) throw new Error(`${table} « ${label} » : ${error.message}`);
    if (!data?.length) return;
    this.report.push({ table, action: "délier", label });
    if (!this.apply) return;
    const { error: delError } = await this.sb
      .from(table)
      .delete()
      .in(
        "id",
        data.map((r) => r.id as string),
      );
    if (delError) throw new Error(`${table} « ${label} » : ${delError.message}`);
  }

  /** Renseigne une colonne encore vide d'une ligne déjà importée (sans écraser une saisie). */
  async fillIfEmpty(table: string, id: string, column: string, value: unknown, label: string) {
    if (this.isDry(id)) return;
    const { data, error } = await this.sb.from(table).select(column).eq("id", id).single();
    if (error) throw new Error(`${table} « ${label} » : ${error.message}`);
    if ((data as unknown as Record<string, unknown>)[column] !== null) return;
    this.report.push({ table, action: "compléter", label });
    await this.update(table, id, { [column]: value }, label);
  }

  printReport() {
    const byTable = new Map<string, ReportLine[]>();
    for (const l of this.report) byTable.set(l.table, [...(byTable.get(l.table) ?? []), l]);
    console.log(`\n=== ${this.apply ? "ÉCRITURE" : "SIMULATION (rien n'est écrit)"} ===`);
    for (const [table, lines] of byTable) {
      const counts = lines.reduce<Record<string, number>>(
        (acc, l) => ({ ...acc, [l.action]: (acc[l.action] ?? 0) + 1 }),
        {},
      );
      console.log(
        `\n## ${table} — ${Object.entries(counts)
          .map(([a, n]) => `${n} à ${a === "déjà importé" ? "ignorer (déjà importé)" : a}`)
          .join(", ")}`,
      );
      for (const l of lines) console.log(`  [${l.action}] ${l.label}`);
    }
    if (this.warnings.length) {
      console.log("\n## Points d'attention");
      for (const w of this.warnings) console.log(`  ⚠️  ${w}`);
    }
  }
}
