# Architecture — MG COURS V1 (brouillon, à valider PO)

> Rôle **Architecte**. Statut : brouillon S1.

## Stack

- **Next.js 16** App Router (Turbopack), **React 19**, **TypeScript strict**.
- **Tailwind v4** + **shadcn/ui** (base radix), thème sombre par défaut (`next-themes`).
- **Supabase** : Postgres + Auth (1 compte) + Storage. Accès via `@supabase/ssr`.
- Données : **RSC + Server Actions** (aucun state manager). `@tanstack/react-query` seulement
  si un besoin réel de cache client apparaît.
- **PDF** : `@react-pdf/renderer` (route handlers). **E-mail** : Resend.
- **Factur-X** : lib CII dédiée, profil BASIC (spike E7).
- Extraction PDF (post-MVP) : `unpdf`.

## Découpage

```
src/
  app/
    (app)/            # zone authentifiée : dashboard, modules, resources, students,
                      # assessments, billing, settings
    login/
    api/              # email, invoices, (ocr, imports/* — plus tard)
  components/         # app-sidebar, theme-provider, ui/ (shadcn)
  lib/
    supabase/         # server, client
    env.ts            # validation zod, tolérante au build
    ynov/             # notation, iceberg, invoice  ← logique pure, testée
    pdf/              # outline, results, invoice
    imports/          # notion, hyperplanning (E8)
  types/database.ts   # généré (pnpm db:types)
supabase/migrations/  # SQL versionné
scripts/notion-migrate.ts
```

## Sécurité

- `proxy.ts` (Next 16, runtime nodejs) rafraîchit la session et redirige les routes privées.
- **RLS** sur toutes les tables : `owner_id = auth.uid()`.
- Secrets serveur (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) jamais exposés au client
  (`serverEnv()` uniquement côté serveur).
- **Facturation** = zone critique : logique dans `lib/ynov/invoice.ts` + `iceberg.ts`,
  couverture Vitest exhaustive (paliers, blocages, montants, TVA, numérotation séquentielle).
  Numéro de facture via séquence Postgres par `owner_id`.

## Modèle de données

Voir `DATA-MODEL.md`. Migrations écrites en E1, types régénérés à chaque changement.

## Décisions

Voir `DECISIONS.md` (ADR-001 → ADR-008).

## À trancher en E1

- Représenter `iceberg_state` en `enum` Postgres ou table de transitions ?
- `admin_docs` : `jsonb` de booléens vs table dédiée.
- Storage : un bucket par domaine (`resources`, `fiches`, `outlines`, `invoices`, `photos`)
  avec policies, ou un bucket + préfixes.
