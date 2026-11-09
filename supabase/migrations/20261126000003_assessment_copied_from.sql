-- Évaluation reprise d'un autre module (progression 1.7) : on garde d'où elle vient et elle reste
-- « Reprise : à relire » jusqu'au premier enregistrement par Marie (son sujet et « Ce qui est
-- évalué » parlent peut-être encore de l'autre module, et partiraient tels quels dans le PDF).
-- Ajout seulement. Retour arrière :
--   alter table public.assessment drop column copied_from_id, drop column needs_review;

alter table public.assessment
  add column if not exists copied_from_id uuid references public.assessment (id) on delete set null,
  add column if not exists needs_review boolean not null default false;
