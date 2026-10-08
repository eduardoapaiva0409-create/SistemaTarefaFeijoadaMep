-- ════════════════════════════════════════════════════════════════════════════
-- Programação do dia da Feijoada
-- ════════════════════════════════════════════════════════════════════════════
-- O cronograma do dia como uma fila de blocos (montagem, abertura, feijoada
-- servida, banda, sorteio…). Mesmo desenho de tasks/task_events: `blocos` são
-- os cards e `bloco_events` guarda comentários e histórico na mesma linha do
-- tempo. Inspirado na Programação do Organizacional Riveria.
--
-- DECISÃO CENTRAL — o horário NÃO é gravado, é calculado.
-- Cada bloco guarda `duracao_min` e `ordem`; o início sai da cascata: o bloco
-- começa quando o anterior termina. Gravar "13:30" em cada linha faria "a
-- banda vai tocar 20 min a mais" virar uma dúzia de updates e um cronograma
-- desalinhado na primeira distração. Assim, muda uma duração e o resto do dia
-- se reacomoda sozinho.
--
-- `inicio_fixo` é a âncora: o que tem hora marcada e NÃO desliza (a feijoada
-- sair às 12:30, a saída do espaço às 18:00). Ele reinicia a cascata — e
-- quando o que vem antes estoura por cima dele, a tela mostra o conflito em
-- vez de empurrar o compromisso em silêncio.

-- ────────────────────────────────────────────────────────────────────────────
-- blocos
-- ────────────────────────────────────────────────────────────────────────────
create table public.blocos (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  descricao      text,

  -- Formato do bloco: define a cor da faixa e o ícone na tela.
  tipo           text not null default 'apresentacao'
                 check (tipo in (
                   'operacional', 'abertura', 'refeicao', 'apresentacao',
                   'dinamica', 'intervalo', 'encerramento'
                 )),

  -- Quem conduz ou se apresenta. Texto livre de propósito: banda, DJ e
  -- convidado de fora não têm (nem vão ter) perfil no sistema.
  conduzido_por  text,
  local          text,

  -- Quem, da equipe, responde por este bloco acontecer.
  responsavel_id uuid references public.profiles (id) on delete set null,

  duracao_min    integer not null default 30
                 check (duracao_min between 5 and 720),

  -- Âncora opcional: hora marcada que não desliza com a cascata.
  inicio_fixo    time,

  -- Posição na fila. Aqui a ordem é ASC (o dia lê de cima para baixo), ao
  -- contrário do kanban; arrastar grava o ponto médio entre os vizinhos.
  ordem          double precision not null default extract(epoch from now()),

  criado_por     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index blocos_ordem_idx on public.blocos (ordem);

-- ────────────────────────────────────────────────────────────────────────────
-- bloco_events — comentários e histórico do bloco
-- ────────────────────────────────────────────────────────────────────────────
create table public.bloco_events (
  id         uuid primary key default gen_random_uuid(),
  bloco_id   uuid not null references public.blocos (id) on delete cascade,
  autor_id   uuid references public.profiles (id) on delete set null,
  tipo       text not null check (tipo in (
               'comentario', 'criacao', 'titulo', 'duracao',
               'horario', 'responsavel', 'formato'
             )),
  texto      text,   -- corpo do comentário
  de         text,   -- valor anterior (eventos de mudança)
  para       text,   -- valor novo
  created_at timestamptz not null default now()
);

create index bloco_events_bloco_idx on public.bloco_events (bloco_id, created_at);

-- ════════════════════════════════════════════════════════════════════════════
-- Triggers
-- ════════════════════════════════════════════════════════════════════════════

-- touch_updated_at() já existe (0001) e é genérica.
create trigger blocos_touch_updated_at
  before update on public.blocos
  for each row execute function public.touch_updated_at();

-- Histórico automático. Arrastar NÃO entra: ensaiar o cronograma são dezenas
-- de arrastos, e cada um viraria ruído por cima da conversa. Fica registrado
-- o que muda o dia — nome, duração, hora marcada, dono e formato.
create or replace function public.log_bloco_changes()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.bloco_events (bloco_id, autor_id, tipo)
    values (new.id, coalesce(auth.uid(), new.criado_por), 'criacao');
    return new;
  end if;

  if new.titulo is distinct from old.titulo then
    insert into public.bloco_events (bloco_id, autor_id, tipo, de, para)
    values (new.id, auth.uid(), 'titulo', old.titulo, new.titulo);
  end if;

  if new.duracao_min is distinct from old.duracao_min then
    insert into public.bloco_events (bloco_id, autor_id, tipo, de, para)
    values (new.id, auth.uid(), 'duracao',
            old.duracao_min::text, new.duracao_min::text);
  end if;

  if new.inicio_fixo is distinct from old.inicio_fixo then
    insert into public.bloco_events (bloco_id, autor_id, tipo, de, para)
    values (new.id, auth.uid(), 'horario',
            to_char(old.inicio_fixo, 'HH24:MI'),
            to_char(new.inicio_fixo, 'HH24:MI'));
  end if;

  if new.responsavel_id is distinct from old.responsavel_id then
    insert into public.bloco_events (bloco_id, autor_id, tipo, de, para)
    values (
      new.id, auth.uid(), 'responsavel',
      (select nome from public.profiles where id = old.responsavel_id),
      (select nome from public.profiles where id = new.responsavel_id)
    );
  end if;

  if new.tipo is distinct from old.tipo then
    insert into public.bloco_events (bloco_id, autor_id, tipo, de, para)
    values (new.id, auth.uid(), 'formato', old.tipo, new.tipo);
  end if;

  return new;
end;
$$;

create trigger blocos_log
  after insert or update on public.blocos
  for each row execute function public.log_bloco_changes();

-- Mesmo endurecimento da 0002: função de trigger SECURITY DEFINER não é API.
revoke execute on function public.log_bloco_changes() from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- RLS — a programação é feita a várias mãos
-- ════════════════════════════════════════════════════════════════════════════
-- Diferente de tasks (onde só responsável/criador/admin mexem), aqui qualquer
-- pessoa da organização ajusta o dia: o cronograma é um mapa comum, discutido
-- em conjunto. Apagar um bloco desmonta o dia de todo mundo, então isso fica
-- com o admin ou com quem criou.
alter table public.blocos       enable row level security;
alter table public.bloco_events enable row level security;

create policy blocos_select on public.blocos
  for select to authenticated using (true);

create policy blocos_insert on public.blocos
  for insert to authenticated
  with check (criado_por = auth.uid() or public.is_admin());

create policy blocos_update on public.blocos
  for update to authenticated using (true) with check (true);

create policy blocos_delete on public.blocos
  for delete to authenticated
  using (public.is_admin() or criado_por = auth.uid());

create policy bloco_events_select on public.bloco_events
  for select to authenticated using (true);

-- Do cliente só entra COMENTÁRIO, assinado por quem está logado. O histórico
-- vem pelo trigger (SECURITY DEFINER), por cima desta policy.
create policy bloco_events_insert on public.bloco_events
  for insert to authenticated
  with check (autor_id = auth.uid() and tipo = 'comentario');

create policy bloco_events_delete on public.bloco_events
  for delete to authenticated
  using (tipo = 'comentario' and (autor_id = auth.uid() or public.is_admin()));
