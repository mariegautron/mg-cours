-- US-95 — QCM à tirage individuel, passation par lien personnel (étudiant·es sans compte).
--
-- Modèle : un `quiz` par évaluation individuelle ; des règles de tirage (« N questions de telle catégorie,
-- chacune à X points ») ; une ligne `quiz_attempt` par étudiant·e = invitation (jeton haché) + tentative
-- (tirage figé, réponses, correction). Une seule tentative par étudiant·e (Marie peut la rouvrir ou refaire
-- le tirage). Écart assumé avec la spec d'origine : `quiz_access` et `quiz_attempt` sont fusionnées.
--
-- SÉCURITÉ (voir docs/SECURITY-QCM.md) :
--  · aucune lecture ni écriture directe des tables par `anon` : droits retirés + RLS sans politique anonyme ;
--  · l'anonyme n'a accès qu'à 4 fonctions `security definer` (`mg_quiz_session|start|save|submit`) qui
--    reçoivent le HACHÉ SHA-256 du jeton et ne renvoient que le strict nécessaire ;
--  · les bonnes réponses (`drawn`) ne quittent jamais la base avant le corrigé, lui-même conditionné à la
--    fermeture du QCM pour tout le monde, rattrapages compris (`mg_quiz_family_closed`) ;
--  · limite par jeton dans le SQL (lectures de session), jamais sur `save` / `submit` : on ne perd pas une copie ;
--  · limite par IP (jetons invalides seulement) dans `mg_quiz_ip_failure`, appelable par `service_role` seul.

create type public.quiz_status as enum ('draft', 'published', 'closed');
create type public.quiz_results_mode as enum ('never', 'after_submit', 'after_close');
create type public.quiz_attempt_status as enum ('ready', 'in_progress', 'submitted');

create table public.quiz (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null unique references public.assessment (id) on delete cascade,
  title text not null,
  instructions text not null default '',
  duration_minutes integer check (duration_minutes is null or (duration_minutes > 0 and duration_minutes <= 480)),
  opens_at timestamptz,
  closes_at timestamptz,
  show_results public.quiz_results_mode not null default 'after_close',
  shuffle_questions boolean not null default true,
  shuffle_choices boolean not null default true,
  status public.quiz_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_window_ck check (opens_at is null or closes_at is null or closes_at > opens_at)
);

create table public.quiz_draw_rule (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id uuid not null references public.quiz (id) on delete cascade,
  position integer not null,
  -- Vide : toutes les catégories. Tags : la question doit tous les porter. Types : l'un d'eux (vide = tous).
  category text,
  tags text[] not null default '{}',
  types public.question_type[] not null default '{}',
  count integer not null check (count > 0 and count <= 100),
  points_each numeric(6, 2) not null check (points_each >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, position)
);

create table public.quiz_attempt (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id uuid not null references public.quiz (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  -- Jeton : 256 bits aléatoires, jamais stocké en clair (seul le lien envoyé le contient).
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz,
  sent_at timestamptz,
  used_at timestamptz,
  -- Tiers-temps : multiplicateur de la durée.
  time_multiplier numeric(3, 2) not null default 1 check (time_multiplier >= 1 and time_multiplier <= 3),
  status public.quiz_attempt_status not null default 'ready',
  -- Tirage figé (questions, choix mélangés, corrigés) : ne quitte jamais la base côté anonyme.
  drawn jsonb not null,
  draw_seed text not null,
  question_count integer not null,
  total_points numeric(7, 2) not null,
  -- Questions tirées qui avaient déjà été vues par l'étudiant·e (rattrapage sur banque trop petite).
  reused_count integer not null default 0,
  answers jsonb not null default '{}',
  -- Modifications enregistrées après l'heure limite : conservées, jamais perdues, jamais comptées d'office.
  late_answers jsonb,
  started_at timestamptz,
  deadline_at timestamptz,
  submitted_at timestamptz,
  submitted_late boolean not null default false,
  last_saved_at timestamptz,
  auto_score numeric(7, 2),
  manual_scores jsonb not null default '{}',
  score numeric(7, 2),
  review_complete boolean not null default false,
  -- Corrigé destiné à l'étudiant·e (points par question, bonnes réponses, retours), calculé côté serveur.
  result jsonb,
  calls_window_start timestamptz,
  calls_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);

create index quiz_attempt_quiz_idx on public.quiz_attempt (quiz_id);

create table public.quiz_ip_failure (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  failures integer not null default 0
);

select public.mg_apply_conventions(array['quiz', 'quiz_draw_rule', 'quiz_attempt']);

-- Défense en profondeur : l'anonyme n'a AUCUN droit sur ces tables (la RLS le bloquerait déjà).
revoke all on public.quiz, public.quiz_draw_rule, public.quiz_attempt, public.quiz_ip_failure,
  public.question, public.question_choice from anon;
alter table public.quiz_ip_failure enable row level security;
revoke all on public.quiz_ip_failure from authenticated;

-- ── Aides internes (jamais exposées) ────────────────────────────────────────

-- Le QCM est-il fermé pour tout le monde ? L'évaluation d'origine ET ses rattrapages doivent l'être ; et
-- si des absent·es excusé·es existent, leur rattrapage doit exister (sinon le corrigé fuiterait vers eux).
create function public.mg_quiz_family_closed(p_quiz_id uuid) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_origin uuid;
begin
  select coalesce(a.makeup_of_id, a.id) into v_origin
  from public.quiz q join public.assessment a on a.id = q.assessment_id
  where q.id = p_quiz_id;
  if v_origin is null then return false; end if;

  if exists (
    select 1 from public.quiz qz join public.assessment a2 on a2.id = qz.assessment_id
    where (a2.id = v_origin or a2.makeup_of_id = v_origin) and qz.status <> 'closed'
  ) then return false; end if;

  if exists (select 1 from public.grade g where g.assessment_id = v_origin and g.attendance = 'absent_excused')
     and not exists (
       select 1 from public.quiz qz join public.assessment a2 on a2.id = qz.assessment_id
       where a2.makeup_of_id = v_origin
     ) then return false; end if;
  return true;
end;
$$;

-- Questions telles que vues par l'étudiant·e : liste blanche explicite, AUCUN indice de correction
-- (ni fraction, ni is_correct, ni retour, ni valeur numérique attendue, ni nom de la question).
create function public.mg_quiz_public_questions(p_drawn jsonb) returns jsonb
language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'position', q.ord,
      'type', q.value ->> 'type',
      'statement', q.value ->> 'statement',
      'points', (q.value ->> 'points')::numeric,
      'choices', coalesce((
        select jsonb_agg(jsonb_build_object('id', c.ord - 1, 'text', c.value ->> 'text') order by c.ord)
        from jsonb_array_elements(q.value -> 'choices') with ordinality as c(value, ord)
      ), '[]'::jsonb)
    ) order by q.ord
  ), '[]'::jsonb)
  from jsonb_array_elements(p_drawn) with ordinality as q(value, ord);
$$;

-- Vue de la tentative pour l'étudiant·e, selon son état. Ne renvoie jamais de donnée d'un·e autre.
create function public.mg_quiz_view(p_attempt_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.quiz_attempt%rowtype;
  q public.quiz%rowtype;
  v_closed boolean;
  v_duration integer;
begin
  select * into a from public.quiz_attempt where id = p_attempt_id;
  select * into q from public.quiz where id = a.quiz_id;

  if a.status = 'submitted' then
    v_closed := public.mg_quiz_family_closed(q.id);
    return jsonb_build_object(
      'status', 'submitted', 'title', q.title, 'submitted_at', a.submitted_at, 'late', a.submitted_late,
      'results', case
        when q.show_results = 'never' then jsonb_build_object('visibility', 'hidden')
        when not a.review_complete then jsonb_build_object('visibility', 'pending')
        when q.show_results = 'after_close' and not v_closed then jsonb_build_object('visibility', 'after_close')
        else jsonb_build_object(
          'visibility', 'shown', 'score', a.score, 'max', a.total_points,
          'review', case when v_closed then coalesce(a.result -> 'review', '[]'::jsonb) else null end,
          'questions', case when v_closed then public.mg_quiz_public_questions(a.drawn) else null end,
          'answers', case when v_closed then a.answers else null end
        )
      end
    );
  end if;

  if q.status = 'draft' or (q.opens_at is not null and q.opens_at > now()) then
    return jsonb_build_object('status', 'not_open', 'title', q.title,
      'opens_at', case when q.status = 'published' then q.opens_at end);
  end if;
  if q.status = 'closed' or (a.status = 'ready' and q.closes_at is not null and q.closes_at <= now()) then
    return jsonb_build_object('status', 'window_closed', 'title', q.title);
  end if;

  if a.status = 'ready' then
    v_duration := case when q.duration_minutes is null then null
      else ceil(q.duration_minutes * a.time_multiplier)::integer end;
    return jsonb_build_object('status', 'ready', 'title', q.title, 'instructions', q.instructions,
      'duration_minutes', v_duration, 'closes_at', q.closes_at,
      'question_count', a.question_count, 'total_points', a.total_points);
  end if;

  return jsonb_build_object('status', 'in_progress', 'title', q.title, 'instructions', q.instructions,
    'deadline_at', a.deadline_at, 'server_now', now(),
    'questions', public.mg_quiz_public_questions(a.drawn),
    'answers', coalesce(a.late_answers, a.answers));
end;
$$;

-- Ne garde que les réponses aux questions existantes (positions 1..N), taille plafonnée.
create function public.mg_quiz_clean_answers(p_answers jsonb, p_count integer) returns jsonb
language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
  from jsonb_each(p_answers) as e
  where e.key ~ '^[0-9]{1,3}$' and e.key::integer between 1 and p_count;
$$;

-- ── Fonctions publiques (anon) : reçoivent le HACHÉ du jeton ────────────────

create function public.mg_quiz_session(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.quiz_attempt%rowtype;
  v_calls integer;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into a from public.quiz_attempt where token_hash = p_token_hash and revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  -- Limite par jeton (lectures seulement) : 120 par minute. Jamais appliquée à save / submit.
  update public.quiz_attempt set
    calls_window_start = case when calls_window_start is null or calls_window_start < now() - interval '1 minute'
      then now() else calls_window_start end,
    calls_count = case when calls_window_start is null or calls_window_start < now() - interval '1 minute'
      then 1 else calls_count + 1 end,
    used_at = coalesce(used_at, now())
  where id = a.id returning calls_count into v_calls;
  if v_calls > 120 then return jsonb_build_object('status', 'rate_limited'); end if;

  return public.mg_quiz_view(a.id);
end;
$$;

create function public.mg_quiz_start(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.quiz_attempt%rowtype;
  q public.quiz%rowtype;
  v_deadline timestamptz;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into a from public.quiz_attempt where token_hash = p_token_hash and revoked_at is null for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into q from public.quiz where id = a.quiz_id;

  if a.status = 'ready'
     and q.status = 'published'
     and (q.opens_at is null or q.opens_at <= now())
     and (q.closes_at is null or q.closes_at > now()) then
    v_deadline := least(
      case when q.duration_minutes is null then null
        else now() + make_interval(mins => ceil(q.duration_minutes * a.time_multiplier)::integer) end,
      q.closes_at
    );
    update public.quiz_attempt
      set status = 'in_progress', started_at = now(), deadline_at = v_deadline, used_at = coalesce(used_at, now())
      where id = a.id;
  end if;
  return public.mg_quiz_view(a.id);
end;
$$;

-- Enregistrement automatique. JAMAIS limité : on ne perd pas une copie. Après l'heure limite (+ 90 s de
-- marge réseau), les modifications vont dans `late_answers` : conservées, pas comptées d'office.
create function public.mg_quiz_save(p_token_hash text, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.quiz_attempt%rowtype;
  v_clean jsonb;
  v_late boolean;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 200000 then
    return jsonb_build_object('status', 'bad_request');
  end if;
  select * into a from public.quiz_attempt where token_hash = p_token_hash and revoked_at is null for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if a.status <> 'in_progress' then
    return jsonb_build_object('status', case when a.status = 'submitted' then 'already_submitted' else 'not_started' end);
  end if;

  v_clean := public.mg_quiz_clean_answers(p_answers, a.question_count);
  v_late := a.deadline_at is not null and now() > a.deadline_at + interval '90 seconds';
  if v_late then
    update public.quiz_attempt set late_answers = v_clean, last_saved_at = now() where id = a.id;
  else
    update public.quiz_attempt set answers = v_clean, last_saved_at = now() where id = a.id;
  end if;
  return jsonb_build_object('status', 'ok', 'saved_at', now(), 'late', v_late);
end;
$$;

-- Soumission. JAMAIS refusée pour retard : la copie est rendue, marquée en retard si besoin.
create function public.mg_quiz_submit(p_token_hash text, p_answers jsonb default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.quiz_attempt%rowtype;
  v_clean jsonb;
  v_late boolean;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_answers is not null and (jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 200000) then
    return jsonb_build_object('status', 'bad_request');
  end if;
  select * into a from public.quiz_attempt where token_hash = p_token_hash and revoked_at is null for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if a.status = 'submitted' then return jsonb_build_object('status', 'already_submitted'); end if;
  if a.status <> 'in_progress' then return jsonb_build_object('status', 'not_started'); end if;

  v_late := a.deadline_at is not null and now() > a.deadline_at + interval '90 seconds';
  if p_answers is not null then
    v_clean := public.mg_quiz_clean_answers(p_answers, a.question_count);
    if v_late then a.late_answers := v_clean; else a.answers := v_clean; end if;
  end if;
  update public.quiz_attempt set
    status = 'submitted', submitted_at = now(), submitted_late = v_late,
    answers = a.answers, late_answers = a.late_answers, last_saved_at = now()
  where id = a.id;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- ── Limite par IP (jetons invalides) : appelable par `service_role` seul ─────

create function public.mg_quiz_ip_failure(p_ip_hash text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_failures integer;
begin
  delete from public.quiz_ip_failure where window_start < now() - interval '1 day';
  insert into public.quiz_ip_failure as f (ip_hash, window_start, failures)
    values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update set
    window_start = case when f.window_start < now() - make_interval(secs => p_window_seconds)
      then now() else f.window_start end,
    failures = case when f.window_start < now() - make_interval(secs => p_window_seconds)
      then 1 else f.failures + 1 end
  returning failures into v_failures;
  return v_failures > p_limit;
end;
$$;

-- Droits : rien pour tout le monde, puis l'exact nécessaire.
revoke all on function public.mg_quiz_family_closed(uuid) from public, anon, authenticated;
revoke all on function public.mg_quiz_public_questions(jsonb) from public, anon, authenticated;
revoke all on function public.mg_quiz_view(uuid) from public, anon, authenticated;
revoke all on function public.mg_quiz_clean_answers(jsonb, integer) from public, anon, authenticated;
revoke all on function public.mg_quiz_session(text) from public, anon, authenticated;
revoke all on function public.mg_quiz_start(text) from public, anon, authenticated;
revoke all on function public.mg_quiz_save(text, jsonb) from public, anon, authenticated;
revoke all on function public.mg_quiz_submit(text, jsonb) from public, anon, authenticated;
revoke all on function public.mg_quiz_ip_failure(text, integer, integer) from public, anon, authenticated;

grant execute on function public.mg_quiz_session(text) to anon;
grant execute on function public.mg_quiz_start(text) to anon;
grant execute on function public.mg_quiz_save(text, jsonb) to anon;
grant execute on function public.mg_quiz_submit(text, jsonb) to anon;
grant execute on function public.mg_quiz_ip_failure(text, integer, integer) to service_role;
