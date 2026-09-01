# MG COURS

Application web de gestion pédagogique et de facturation pour Marie Gautron
(ressources, modules, cours, étudiants, évaluations, trames pédagogiques, factures YNOV).

## Démarrage

```bash
nvm use                       # Node 22 (.nvmrc)
pnpm install
cp .env.example .env.local    # renseigner les clés Supabase / Resend
pnpm dev                      # http://localhost:3000
```

Base de données locale (Docker requis) :

```bash
pnpm db:start
pnpm db:reset                 # migrations + seed
pnpm db:types                 # régénère src/types/database.ts
```

## Scripts

| Commande                                 | Rôle                            |
| ---------------------------------------- | ------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | dev / build / prod              |
| `pnpm lint` / `pnpm format`              | ESLint / Prettier               |
| `pnpm typecheck`                         | `next typegen` + `tsc --noEmit` |
| `pnpm test` / `pnpm test:e2e`            | Vitest / Playwright + axe       |

## Documentation

`AGENTS.md` (conventions) · `docs/ROADMAP.md` · `docs/prd.md` · `docs/architecture.md` ·
`docs/ux-ui-spec.md` · `docs/YNOV-RULES.md` · `docs/DATA-MODEL.md` · `docs/BACKLOG.md`.
