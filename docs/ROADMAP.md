# Roadmap — jusqu'au 12 octobre 2026

Jalon dur : **trame de la 1re séance envoyée ~27/09** (12/10 − 15 j).

| Sem. | Dates       | Objectif                                                      | Checkpoint PO                                                              |
| ---- | ----------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| S1   | 02–08/09    | Cadrage (`prd` / `architecture` / `ux-ui-spec`) + **E0 + E1** | Docs validés ; app déployée vide ; login ; `db reset` OK                   |
| S2   | 09–15/09    | **E2 + E3 + E4**                                              | Ressource → 2 modules ; import étudiants ; encart notes ; `trame_due_date` |
| S3   | 16–22/09    | **E5** + début **E6** (trame PDF)                             | Noter un groupe de bout en bout ; 1re trame générée                        |
| S4   | 23–29/09    | Fin **E6** — trame 1re séance envoyée ≤ 27/09                 | Trame _Méthodologies Agile & Scrum_ envoyée                                |
| S5   | 30/09–06/10 | **E7** + début **E8**                                         | Facture Factur-X exemple, mentions vérifiées                               |
| S6   | 07–12/10    | **E9** : migration Notion réelle, recette, prod               | **12/10 — GO LIVE**                                                        |
| Post | 13–31/10    | Test Factur-X avec YNOV, 1re facture réelle                   | Facture YNOV acceptée                                                      |

## Plan de repli

1. S3 en retard → trame en saisie manuelle.
2. S4 en retard → import étudiants seulement ; script Notion en post-live.
3. S5 en retard → Factur-X profil MINIMUM d'abord.
4. Non négociable 12/10 : E0–E3 + trame + saisie notes.

## Pré-requis PO (S1)

- Coordonnées facturation : SIRET, n° TVA, adresse, **tarif horaire**, RIB.
- Projet Supabase Cloud créé + clés → `.env.local`.
- Export Notion complet de l'espace _Enseignement_.
- PDF d'une vraie fiche pédagogique + gabarit de trame YNOV + exemple de facture acceptée.
- Dates réelles des 1res séances de chaque module.
- Canal e-invoice confirmé (PA vs e-mail structuré).

## V2 / V3 (post-MVP)

US-40 → US-52 : accès étudiants, propositions IA (ressources, sujets, grilles), slides,
collaboration, statistiques, archivage automatique.
