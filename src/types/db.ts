/**
 * Ré-exports pratiques des types de base générés.
 * Importer depuis `@/types/db`, pas depuis `@/types/database` directement.
 */
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from "./database";
export { Constants } from "./database";
