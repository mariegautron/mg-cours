-- QCM chronométré ou non : sans durée, la copie n'affiche plus de décompte mais « À rendre avant … »
-- (rendu automatique à la fermeture, comme avant). La vue d'une copie en cours dit seulement si le
-- QCM est chronométré (`timed`). Même fonction qu'au 17 octobre, un champ en plus ; rien d'autre
-- ne change.

create or replace function public.mg_quiz_view(p_attempt_id uuid) returns jsonb
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
    'timed', q.duration_minutes is not null,
    'questions', public.mg_quiz_public_questions(a.drawn),
    'answers', coalesce(a.late_answers, a.answers));
end;
$$;

revoke all on function public.mg_quiz_view(uuid) from public, anon, authenticated;
