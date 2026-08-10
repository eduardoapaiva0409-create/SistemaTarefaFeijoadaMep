-- ════════════════════════════════════════════════════════════════════════════
-- Sistema de Tarefas — Feijoada do Escalada — schema inicial
-- ════════════════════════════════════════════════════════════════════════════
-- Quatro tabelas: profiles (a equipe), tasks (o centro), task_items (checklist)
-- e task_events (comentários + histórico). Oficina única, sem multi-tenant.

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────────
-- profiles — espelho de auth.users com os dados da oficina
-- ────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null,
  email      text,
  cargo      text,
  papel      text not null default 'colaborador'
             check (papel in ('admin', 'colaborador')),
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.profiles.papel is
  'admin edita qualquer tarefa e gerencia a equipe; colaborador edita só as suas';

-- ────────────────────────────────────────────────────────────────────────────
-- tasks
-- ────────────────────────────────────────────────────────────────────────────
create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  descricao      text,
  status         text not null default 'a_fazer'
                 check (status in ('a_fazer', 'em_andamento', 'concluida')),
  prioridade     text not null default 'media'
                 check (prioridade in ('baixa', 'media', 'alta', 'urgente')),

  responsavel_id uuid references public.profiles (id) on delete set null,
  criado_por     uuid references public.profiles (id) on delete set null,

  prazo          date,
  concluida_em   timestamptz,

  -- Posição dentro da coluna do kanban. Default = epoch, então tarefa nova
  -- nasce no topo (ordenação DESC); arrastar grava o ponto médio entre vizinhos.
  ordem          double precision not null default extract(epoch from now()),

  -- Recorrência: ao concluir, o sistema gera a próxima ocorrência uma única vez
  -- (proxima_gerada trava a duplicata se a tarefa for reaberta e reconcluída).
  recorrencia           text check (recorrencia in ('diaria', 'semanal', 'quinzenal', 'mensal')),
  recorrencia_origem_id uuid references public.tasks (id) on delete set null,
  proxima_gerada        boolean not null default false,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index tasks_status_idx      on public.tasks (status);
create index tasks_responsavel_idx on public.tasks (responsavel_id);
create index tasks_prazo_idx       on public.tasks (prazo);
create index tasks_ordem_idx       on public.tasks (ordem desc);

-- ────────────────────────────────────────────────────────────────────────────
-- task_items — checklist da tarefa
-- ────────────────────────────────────────────────────────────────────────────
create table public.task_items (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  texto      text not null,
  concluido  boolean not null default false,
  ordem      integer not null default 0,
  created_at timestamptz not null default now()
);

create index task_items_task_idx on public.task_items (task_id, ordem);

-- ────────────────────────────────────────────────────────────────────────────
-- task_events — comentários e histórico na mesma linha do tempo
-- ────────────────────────────────────────────────────────────────────────────
-- Os eventos de mudança são gravados por trigger (log_task_changes), não pela
-- UI: assim o histórico não depende do cliente ter lembrado de registrar.
create table public.task_events (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  autor_id   uuid references public.profiles (id) on delete set null,
  tipo       text not null check (tipo in (
               'comentario', 'criacao', 'status', 'responsavel', 'prazo', 'prioridade'
             )),
  texto      text,   -- corpo do comentário
  de         text,   -- valor anterior (eventos de mudança)
  para       text,   -- valor novo
  created_at timestamptz not null default now()
);

create index task_events_task_idx on public.task_events (task_id, created_at);

-- ════════════════════════════════════════════════════════════════════════════
-- Funções auxiliares
-- ════════════════════════════════════════════════════════════════════════════

-- SECURITY DEFINER para não bater na RLS de profiles ao ser chamada de dentro
-- de uma policy de profiles (recursão infinita).
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and papel = 'admin' and ativo
  );
$$;

-- Quem pode mexer na tarefa: admin, responsável ou quem criou.
create or replace function public.pode_editar_task(p_task_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.tasks
    where id = p_task_id
      and (responsavel_id = auth.uid() or criado_por = auth.uid())
  );
$$;

create or replace function public.proxima_data(p_base date, p_recorrencia text)
returns date
language sql immutable as $$
  select (case p_recorrencia
    when 'diaria'    then p_base + interval '1 day'
    when 'semanal'   then p_base + interval '7 days'
    when 'quinzenal' then p_base + interval '14 days'
    when 'mensal'    then p_base + interval '1 month'
  end)::date;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Triggers
-- ════════════════════════════════════════════════════════════════════════════

-- Novo usuário no Auth → perfil na oficina. O PRIMEIRO vira admin sozinho,
-- senão ninguém conseguiria promover ninguém.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, cargo, papel)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'cargo', ''),
    case
      when not exists (select 1 from public.profiles) then 'admin'
      when new.raw_user_meta_data ->> 'papel' = 'admin' then 'admin'
      else 'colaborador'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- Carimba/limpa concluida_em conforme o status muda.
create or replace function public.stamp_concluida_em()
returns trigger language plpgsql as $$
begin
  if new.status = 'concluida' and coalesce(old.status, '') <> 'concluida' then
    new.concluida_em := now();
  elsif new.status <> 'concluida' then
    new.concluida_em := null;
  end if;
  return new;
end;
$$;

create trigger tasks_stamp_concluida_em
  before update on public.tasks
  for each row execute function public.stamp_concluida_em();

-- Histórico automático. SECURITY DEFINER porque escreve em task_events em nome
-- de quem editou, sem depender da policy de insert.
create or replace function public.log_task_changes()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_events (task_id, autor_id, tipo)
    values (new.id, auth.uid(), 'criacao');
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.task_events (task_id, autor_id, tipo, de, para)
    values (new.id, auth.uid(), 'status', old.status, new.status);
  end if;

  if new.responsavel_id is distinct from old.responsavel_id then
    insert into public.task_events (task_id, autor_id, tipo, de, para)
    values (
      new.id, auth.uid(), 'responsavel',
      (select nome from public.profiles where id = old.responsavel_id),
      (select nome from public.profiles where id = new.responsavel_id)
    );
  end if;

  if new.prazo is distinct from old.prazo then
    insert into public.task_events (task_id, autor_id, tipo, de, para)
    values (new.id, auth.uid(), 'prazo', old.prazo::text, new.prazo::text);
  end if;

  if new.prioridade is distinct from old.prioridade then
    insert into public.task_events (task_id, autor_id, tipo, de, para)
    values (new.id, auth.uid(), 'prioridade', old.prioridade, new.prioridade);
  end if;

  return new;
end;
$$;

create trigger tasks_log_insert
  after insert on public.tasks
  for each row execute function public.log_task_changes();

create trigger tasks_log_update
  after update on public.tasks
  for each row execute function public.log_task_changes();

-- Recorrência: concluir uma tarefa recorrente gera a próxima ocorrência com o
-- checklist copiado (zerado). Não recorre infinitamente porque o UPDATE de
-- proxima_gerada reentra com old.status = 'concluida' e sai na primeira guarda.
create or replace function public.gerar_proxima_ocorrencia()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_novo_id uuid;
  v_prazo   date;
begin
  if new.status <> 'concluida' or old.status = 'concluida' then return new; end if;
  if new.recorrencia is null or new.proxima_gerada then return new; end if;

  v_prazo := public.proxima_data(coalesce(new.prazo, current_date), new.recorrencia);

  insert into public.tasks (
    titulo, descricao, status, prioridade, responsavel_id, criado_por,
    prazo, recorrencia, recorrencia_origem_id
  )
  values (
    new.titulo, new.descricao, 'a_fazer', new.prioridade, new.responsavel_id,
    coalesce(new.criado_por, auth.uid()), v_prazo, new.recorrencia,
    coalesce(new.recorrencia_origem_id, new.id)
  )
  returning id into v_novo_id;

  insert into public.task_items (task_id, texto, ordem)
  select v_novo_id, texto, ordem
  from public.task_items
  where task_id = new.id
  order by ordem;

  update public.tasks set proxima_gerada = true where id = new.id;
  return new;
end;
$$;

create trigger tasks_gerar_proxima
  after update on public.tasks
  for each row execute function public.gerar_proxima_ocorrencia();

-- ════════════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles    enable row level security;
alter table public.tasks       enable row level security;
alter table public.task_items  enable row level security;
alter table public.task_events enable row level security;

-- profiles: todo mundo vê a equipe; edita a si mesmo (admin edita qualquer um).
create policy profiles_select on public.profiles
  for select to authenticated using (true);

-- `id = auth.uid()` permite auto-reparo: se alguém foi criado no Auth antes
-- desta migration existir, o app recria o próprio perfil no primeiro login.
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin());

create policy profiles_delete on public.profiles
  for delete to authenticated using (public.is_admin());

-- tasks: todos veem tudo (a oficina inteira precisa enxergar o quadro);
-- só admin, responsável ou autor alteram.
create policy tasks_select on public.tasks
  for select to authenticated using (true);

create policy tasks_insert on public.tasks
  for insert to authenticated with check (criado_por = auth.uid() or public.is_admin());

create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_admin() or responsavel_id = auth.uid() or criado_por = auth.uid());

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_admin() or criado_por = auth.uid());

-- task_items: acompanham a permissão da tarefa-mãe.
create policy task_items_select on public.task_items
  for select to authenticated using (true);

create policy task_items_write on public.task_items
  for insert to authenticated with check (public.pode_editar_task(task_id));

create policy task_items_update on public.task_items
  for update to authenticated using (public.pode_editar_task(task_id));

create policy task_items_delete on public.task_items
  for delete to authenticated using (public.pode_editar_task(task_id));

-- task_events: qualquer um comenta; ninguém reescreve o histórico
-- (só o próprio comentário pode ser apagado, e o admin apaga qualquer um).
create policy task_events_select on public.task_events
  for select to authenticated using (true);

create policy task_events_insert on public.task_events
  for insert to authenticated
  with check (autor_id = auth.uid() and tipo = 'comentario');

create policy task_events_delete on public.task_events
  for delete to authenticated
  using (tipo = 'comentario' and (autor_id = auth.uid() or public.is_admin()));
