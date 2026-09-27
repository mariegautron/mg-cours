-- US-76 : date du dernier envoi des résultats par e-mail (rappel avant un nouvel envoi).
alter table public.assessment
  add column results_sent_at timestamptz;
