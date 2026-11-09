-- Adresse de contact affichée aux étudiant·es (espaces, lien de la classe, pages d'erreur).
-- Distincte de l'e-mail de facturation (teacher_profile.email). Ajout seulement.

alter table public.teacher_profile
  add column if not exists student_contact_email text
    check (student_contact_email is null or student_contact_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');

-- Valeur donnée par Marie le 9 novembre 2026 (une seule enseignante dans l'appli).
update public.teacher_profile
  set student_contact_email = 'marie.gautron44@ynov.com'
  where student_contact_email is null;
