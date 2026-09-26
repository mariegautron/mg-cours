-- MG COURS — données de dev local.
-- Crée un utilisateur de test + un jeu de données minimal (écoles, profil,
-- module exemple « Méthodologies Agile & Scrum »).
-- Identifiants locaux : marie@local.test / password123

do $$
declare
  uid uuid := '11111111-1111-1111-1111-111111111111';
  ynov_id uuid := '22222222-2222-2222-2222-000000000001';
  mds_id uuid := '22222222-2222-2222-2222-000000000002';
  module_id uuid := '33333333-3333-3333-3333-000000000001';
begin
  -- Utilisateur de test ------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data
  )
  values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    'marie@local.test', crypt('password123', gen_salt('bf')),
    now(), now(), now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}', '{}'
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  values (
    uid, uid,
    format('{"sub":"%s","email":"marie@local.test"}', uid)::jsonb,
    'email', now(), now(), now()
  )
  on conflict (provider, provider_id) do nothing;

  -- Profil prestataire -----------------------------------------------------
  insert into public.teacher_profile (owner_id, legal_name, email, vat_exempt)
  values (uid, 'Marie Gautron', 'marie@local.test', true)
  on conflict (owner_id) do nothing;

  -- Écoles ---------------------------------------------------------------
  insert into public.school (id, owner_id, name, siret, billing_email, pa_identifier)
  values
    (ynov_id, uid, 'YNOV Campus Nantes', '80442673200033',
     'fournisseurs-nantes@ynov.com', '804426732_YZ_YNOV_NAN'),
    (mds_id, uid, 'MyDigitalSchool', null, null, null)
  on conflict (id) do nothing;

  -- Module exemple (fiche pédagogique YNOV A2627_4752) -----------------
  insert into public.module (
    id, owner_id, school_id, name, level, year, ycode,
    total_hours, hours_lecture, hours_td, iceberg_state
  )
  values (
    module_id, uid, ynov_id, 'Méthodologies Agile & Scrum',
    'Mastère 1 Informatique', 2026, 'A2627_4752',
    21, 10, 11, 'module_created'
  )
  on conflict (id) do nothing;

  -- 6 séances (unités pédagogiques de la fiche) -----------------------
  insert into public.course (owner_id, module_id, title, position, type, learning_objectives)
  values
    (uid, module_id, 'Introduction à l''Agilité', 1, 'lecture',
     array['Valeurs et principes', 'Agile vs cycle en V', 'Rôles Scrum', 'Frameworks existants']),
    (uid, module_id, 'Création d''un backlog produit', 2, 'workshop',
     array['Construire un board Scrum', 'Simulation', 'Répartition des tâches']),
    (uid, module_id, 'Les estimations en agile', 3, 'lecture',
     array['Story points', 'Méthodes d''estimation', 'Vélocité', 'Gestion des dépendances']),
    (uid, module_id, 'Atelier de poker planning', 4, 'workshop',
     array['Planification en sprint backlog', 'Simulation de sprint avec suivi']),
    (uid, module_id, 'Objectifs des points Scrum', 5, 'lecture',
     array['Daily', 'Review', 'Rétrospective', 'Construire une rétrospective']),
    (uid, module_id, 'Simulation complète', 6, 'workshop',
     array['Animer une rétrospective', 'Analyse de la simulation', 'Débrief global'])
  on conflict do nothing;

  -- Commentaires prédéfinis -----------------------------------------
  insert into public.predefined_comment (owner_id, text, category, tags)
  values
    (uid, 'Présentation claire et bien structurée.', 'positive', array['oral']),
    (uid, 'Bonne maîtrise des cérémonies Scrum.', 'positive', array['agile']),
    (uid, 'Estimations peu argumentées, à étayer.', 'negative', array['agile', 'estimation']),
    (uid, 'Pensez à limiter le work in progress sur le board.', 'advice', array['kanban'])
  on conflict do nothing;
end $$;
