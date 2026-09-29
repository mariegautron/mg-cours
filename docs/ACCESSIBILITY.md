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

Légende : ✅ vérifié automatiquement (axe-core en CI, 0 violation WCAG 2.0/2.1 A + AA) ·
🔎 **à vérifier à la main par Marie** (clavier, lecteur d'écran, zoom, contraste des états) · — non couvert.

| Écran                                                          | axe | Clavier  | Lecteur d'écran | Contraste AA  | Zoom 200 % |
| -------------------------------------------------------------- | --- | -------- | --------------- | ------------- | ---------- |
| Connexion                                                      | ✅  | 🔎       | 🔎              | ✅ (axe)      | 🔎         |
| Ressources (création, détail, liste filtrée et groupée)        | ✅  | 🔎       | 🔎              | ✅ (axe)      | 🔎         |
| Mode présentation (séance, module ; document et diapositives)  | ✅  | ✅ (e2e) | 🔎              | ✅ (2 thèmes) | 🔎         |
| Module (détail : trame, séances, groupes, docs admin)          | ✅  | 🔎       | 🔎              | ✅ (axe)      | 🔎         |
| Étudiants / groupes                                            | ✅  | 🔎       | 🔎              | ✅ (axe)      | 🔎         |
| Évaluation + saisie de notes                                   | ✅  | 🔎       | 🔎              | ✅ (axe)      | 🔎         |
| Réglages                                                       | ✅  | 🔎       | 🔎              | ✅ (axe)      | 🔎         |
| Facturation (conditions, facture)                              | ✅  | 🔎       | 🔎              | ✅ (axe)      | 🔎         |
| Listes globales (modules, étudiants, évaluations, facturation) | —   | 🔎       | 🔎              | —             | 🔎         |
| Tableau de bord                                                | —   | 🔎       | 🔎              | —             | 🔎         |

Mode présentation : navigation clavier complète (flèches, Début/Fin, F, S, D, +/−) ignorée pendant une saisie ;
« Diapositive n sur N » annoncé en `aria-live="polite"` sans voler le focus ; chaque diapo est une `section`
(`aria-roledescription="diapositive"`) ; fondu d'entrée coupé sous `prefers-reduced-motion` ; taille du texte
réglable (80–150 %) en plus du zoom navigateur. Visibilité « Enseignante uniquement » signalée par du texte, pas
seulement une couleur.

Limites honnêtes : axe détecte ~30-40 % des critères RGAA ; il ne remplace pas une passe manuelle
(NVDA/VoiceOver, navigation clavier complète, zoom 400 %). Les PDF générés (trame, résultats,
facture) ne sont pas audités en accessibilité (PDF/UA) — hors périmètre MVP.
Le design « ludique & coloré » est appliqué (`DESIGN.md`) : axe passe à 0 violation sur 12 écrans dans les
deux thèmes (`e2e/design.spec.ts`). Toute nouvelle couleur doit être revérifiée en AA.

## Messages et états (audit UX du 29/09)

- **Annonces** : la coque n'a qu'une zone d'annonce de navigation (`aria-live="polite"`, « Chargement… ») ; les
  pages gardent leurs propres `role="status"` (compteurs, enregistrements). Un retour d'action ne doit jamais
  ajouter un second `role="status"` ambigu : utiliser un conteneur `aria-live="polite"` (`DownloadButton`,
  `Celebration`).
- **Attente** : `PendingButton` (`aria-busy`, libellé « Archivage… », focus conservé, rotation neutralisée sous
  `prefers-reduced-motion`) plutôt que `disabled`, qui fait quitter le bouton de l'ordre de tabulation.
- **Erreurs** : `role="alert"` (`ActionError`), cause simple et issue en lien ; « Ta saisie est conservée »
  seulement si le formulaire garde ses champs (`keepFormValues`).
- **Page introuvable / erreur** : titre `h1` qui reçoit le focus (erreur), issue claire, sans écran technique.
