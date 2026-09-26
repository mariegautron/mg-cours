-- Le tarif horaire est saisi uniquement sur le module (`module.hourly_rate`) :
-- plus de tarif par défaut sur le profil prestataire.
alter table public.teacher_profile drop column hourly_rate;
