-- ════════════════════════════════════════════════════════════════════════════
-- concluida_em também no INSERT
-- ════════════════════════════════════════════════════════════════════════════
-- O dialog de nova tarefa deixa escolher status "Concluída" já na criação. Como
-- o carimbo de concluida_em só existia em BEFORE UPDATE, essa tarefa nascia com
-- concluida_em NULL — e aí não entrava em "Concluídas na semana" no dashboard
-- nem exibia "Feita DD/MM" no card.
--
-- A função passa a olhar tg_op: em INSERT não se pode ler `old` (não está
-- atribuído em trigger de insert e o acesso levanta erro).

create or replace function public.stamp_concluida_em()
returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'concluida' then
      new.concluida_em := now();
    end if;
    return new;
  end if;

  if new.status = 'concluida' and old.status <> 'concluida' then
    new.concluida_em := now();
  elsif new.status <> 'concluida' then
    new.concluida_em := null;
  end if;
  return new;
end;
$$;

create trigger tasks_stamp_concluida_em_insert
  before insert on public.tasks
  for each row execute function public.stamp_concluida_em();
