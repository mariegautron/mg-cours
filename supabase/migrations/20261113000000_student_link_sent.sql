-- Envoi des liens personnels de l'espace étudiant·e par e-mail : quand le lien a été envoyé, et la
-- cause d'un échec (pour le montrer par étudiant·e). Colonnes additives : sans elles, l'envoi
-- fonctionne mais l'état « envoyé le … » n'est pas retenu après rechargement.

alter table public.module_student_link
  add column sent_at timestamptz,
  add column send_error text;
