/**
 * Types de la base Supabase.
 *
 * Fichier généré — NE PAS ÉDITER À LA MAIN.
 * Régénérer après chaque migration :  pnpm db:types
 *
 * Placeholder tant que le schéma (E1) n'existe pas.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
