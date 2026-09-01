# Spec UX/UI — MG COURS V1 (brouillon, à valider PO)

> Rôle **UX**. Statut : brouillon S1. Choix PO déjà actés ci-dessous.

## Direction validée par la PO

- **Ambiance** : ludique & colorée, **dark-first** (thème clair secondaire).
- **Double registre** :
  - **Coque expressive** — barre latérale, dashboard, états vides, onboarding, alertes :
    couleur, typo d'affichage, dégradés/halos, mascotte, motion.
  - **Données calmes** — tableaux de notes, saisie, trame, **facture** : sobre, dense,
    ultra-lisible. La facture reste strictement neutre.
- **Navigation** : barre latérale gauche persistante (Tableau de bord, Modules, Ressources,
  Étudiants, Évaluations, Facturation, Réglages). — implémentée (`app-sidebar.tsx`).
- **Éléments signature** (à concevoir) : typo d'affichage marquée (Bricolage Grotesque en
  place, à confirmer), dégradés/halos sur fond sombre, mascotte + illustrations (états vides,
  onboarding, alertes iceberg, réussite), jeu d'icônes maison + micro-animations signées —
  toutes désactivables (`prefers-reduced-motion`).

## Palette

À proposer par l'UX à partir des couleurs Notion de Marie et de ses thèmes accessibilité /
numérique responsable. Contrainte dure : tous les couples texte/fond ≥ **AA**, halos inclus.
Tokens actuels = défauts shadcn neutres (placeholder) → à remplacer.

## Livrables attendus

- Parcours clés + wireframes : dashboard, liste + détail module, éditeur de cours, saisie de
  notes, checklist iceberg, génération de facture, génération de trame.
- Design system : tokens (couleur, espace, rayon, ombre, typo, motion), composants shadcn
  thémés, doc d'usage.
- Planche mascotte + illustrations.
- Spec motion (durées, courbes, déclencheurs) + règle `reduced-motion`.
- Checklist RGAA par écran → `docs/ACCESSIBILITY.md`.

## Fait en E0

Shell (barre latérale + header + zone principale), page de connexion, tableau de bord stub,
thème sombre. Styles = placeholders, à retravailler avec la palette validée.
