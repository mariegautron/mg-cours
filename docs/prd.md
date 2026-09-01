# PRD — MG COURS V1 (brouillon, à valider PO)

> Rôle **Product**. Statut : brouillon S1. Source : Notion « … COMPLETE » + entretien PO.

## Problème

Marie gère sa pédagogie dans Notion + Moodle + Hyperplanning. Contenus dupliqués d'un
module à l'autre, données dispersées, et **factures bloquées** quand une étape du process
YNOV est oubliée → retards de paiement.

## Utilisatrice

Marie Gautron, enseignante intervenante (YNOV Nantes, MyDigitalSchool, …). Seule utilisatrice.

## Objectif V1

Outil opérationnel pour le **12/10/2026** : centraliser, réutiliser sans duplication,
générer trames + PDF + **factures électroniques** conformes, ne rien oublier (alertes).

## Périmètre MVP

Ressources réutilisables · modules (YCODE, heures, minimum de notes) · cours · étudiants /
groupes · évaluations + notation pondérée · trame pédagogique PDF · export résultats PDF +
e-mail · checklist iceberg + blocage facturation · facture Factur-X · migration Notion
(script) · imports CSV/XLSX.

## Hors MVP

OCR fiche pédagogique, import Moodle, compare-notes HP automatique, accès étudiants,
propositions IA, slides, collaboration, statistiques. (cf. `ROADMAP.md`)

## Epics & user stories

Voir `BACKLOG.md` (E0 → E9, US-00 → US-39). Détail des critères d'acceptation par story :
`docs/stories/` (créé au fil de l'eau).

## Contraintes produit

Deadline 12/10 · trame à envoyer J-15 · facturation électronique obligatoire · RGAA AA ·
design « ludique & coloré » dark-first · modèle de données en anglais · aucune trace d'outil.

## Questions ouvertes (PO)

- Tarif horaire par école ? Exonération TVA (art. 293 B) ou 20 % ?
- Canal e-invoice : PA (Chorus Pro) disponible, ou e-mail structuré ?
- Référence bon de commande fournie par YNOV avant la 1re facture ?
