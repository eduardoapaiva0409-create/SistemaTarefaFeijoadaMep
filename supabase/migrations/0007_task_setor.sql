-- ════════════════════════════════════════════════════════════════════════════
-- Setor na tarefa — opcional, só para organizar a visão
-- ════════════════════════════════════════════════════════════════════════════
-- Tarefa não pertence a um setor por obrigação: muita coisa da Feijoada é
-- solta ("comprar gelo") e forçar um setor só criaria classificação inventada.
-- A coluna é nullable e sem default — quem quiser agrupar por frente de
-- trabalho marca; quem não quiser, ignora.
--
-- A lista de setores é a MESMA de profiles.setor (ver 0006_funcao.sql). Setor
-- novo tem que entrar nos dois checks e em SETOR_ORDER (src/lib/format.ts).

alter table public.tasks
  add column setor text
  check (setor in (
    'coordenacao', 'secretaria', 'tesouraria', 'marketing', 'infraestrutura',
    'decoracao', 'tios', 'entretenimento', 'bebidas', 'delivery'
  ));

comment on column public.tasks.setor is
  'Setor responsável pela tarefa. Null = sem setor, e tudo bem.';

-- Filtrar por setor é a razão da coluna existir; o índice parcial ignora as
-- tarefas sem setor, que são a maioria e nunca são buscadas por ele.
create index tasks_setor_idx on public.tasks (setor) where setor is not null;

-- Trocar o setor da tarefa é mudança de organização, não de andamento — não
-- entra no histórico de task_events junto com status/responsável/prazo.
