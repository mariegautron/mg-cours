-- QCM (rattrapages, lot 4) : le chrono démarrait au clic sur « Commencer », avant le chargement de
-- la première question (30 s d'ouverture mangées sur 10 min). Désormais l'écran des questions, une
-- fois affiché, appelle `mg_quiz_clock` : l'heure limite repart de cet instant, une seule fois par
-- copie, et seulement dans les 5 minutes qui suivent « Commencer » sans réponse enregistrée (on ne
-- peut donc pas s'en servir pour regagner du temps). Purement additif.

alter table public.quiz_attempt add column if not exists clock_started_at timestamptz;

create or replace function public.mg_quiz_clock(p_token_hash text) returns jsonb
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
  if a.status <> 'in_progress' then
    return jsonb_build_object('status', a.status);
  end if;
  select * into q from public.quiz where id = a.quiz_id;

  if a.clock_started_at is null
     and q.duration_minutes is not null
     and a.started_at is not null
     and a.started_at > now() - interval '5 minutes'
     and a.last_saved_at is null
     and (a.answers is null or a.answers = '{}'::jsonb) then
    v_deadline := least(
      now() + make_interval(mins => ceil(q.duration_minutes * a.time_multiplier)::integer),
      q.closes_at
    );
    update public.quiz_attempt
      set deadline_at = v_deadline, clock_started_at = now()
      where id = a.id;
    a.deadline_at := v_deadline;
  elsif a.clock_started_at is null then
    update public.quiz_attempt set clock_started_at = now() where id = a.id;
  end if;

  return jsonb_build_object('status', 'in_progress', 'deadline_at', a.deadline_at, 'server_now', now());
end;
$$;

revoke all on function public.mg_quiz_clock(text) from public, anon, authenticated;
grant execute on function public.mg_quiz_clock(text) to anon;
