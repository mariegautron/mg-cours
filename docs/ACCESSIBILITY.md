# Accessibilité — RGAA 4.1 / WCAG 2.1 AA

C'est le domaine d'expertise de Marie : l'app doit être **exemplaire**.

## Exigences

- HTML sémantique, un seul `<h1>` par page, hiérarchie de titres cohérente.
- Navigation clavier complète, ordre de tabulation logique, focus visible, pas de piège.
- Cible tactile ≥ 44 px ; zoom 200 % sans perte d'info ; contenu responsive dès 320 px.
- Libellés `<label for>` reliés ; erreurs de formulaire reliées au champ (`aria-describedby`)
  et annoncées (`role="alert"` / live region).
- Contraste **AA** : 4.5:1 texte courant, 3:1 grands titres et composants — **y compris sur
  les aplats colorés et les halos** de la direction « ludique ».
- `prefers-reduced-motion` respecté (déjà dans `globals.css`) ; toutes les animations
  désactivables.
- Images informatives : `alt` pertinent ; décoratives : `alt=""`.
- Composants : privilégier Radix (shadcn) ; ARIA seulement si nécessaire.

## Vérification

- `pnpm test:e2e` lance `@axe-core/playwright` sur chaque écran → **0 violation** (bloquant CI).
- 1 passe manuelle lecteur d'écran (NVDA ou VoiceOver) **par epic**.
- Checklist par écran ci-dessous, cochée dans la PR qui livre l'écran.

## Checklist par écran

| Écran                    | axe 0 violation | Clavier | Lecteur d'écran | Contraste AA | Zoom 200 % |
| ------------------------ | --------------- | ------- | --------------- | ------------ | ---------- |
| Connexion                | ⏳              | ⏳      | ⏳              | ⏳           | ⏳         |
| Tableau de bord          | ⏳              | ⏳      | ⏳              | ⏳           | ⏳         |
| Modules (liste / détail) | ⏳              | ⏳      | ⏳              | ⏳           | ⏳         |
| Ressources               | ⏳              | ⏳      | ⏳              | ⏳           | ⏳         |
| Étudiants / groupes      | ⏳              | ⏳      | ⏳              | ⏳           | ⏳         |
| Saisie de notes          | ⏳              | ⏳      | ⏳              | ⏳           | ⏳         |
| Checklist iceberg        | ⏳              | ⏳      | ⏳              | ⏳           | ⏳         |
| Génération de facture    | ⏳              | ⏳      | ⏳              | ⏳           | ⏳         |
| Génération de trame      | ⏳              | ⏳      | ⏳              | ⏳           | ⏳         |
