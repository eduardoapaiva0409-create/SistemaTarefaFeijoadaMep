<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sistema de Tarefas — Feijoada do Escalada

Delegação e acompanhamento de tarefas da organização da Feijoada do Escalada
(evento do grupo de escalada). Derivado do Sistema de Tarefas AutoRio: mesma
stack, mesmo design system, **banco Supabase próprio e separado** — nenhum
dado do projeto original é reaproveitado.

**Escopo: exclusivamente tarefas.** Delegar, acompanhar e concluir tarefas da
organização do evento (compras, logística, equipe). Não é sistema financeiro
nem controle de convidados/vendas de ingresso — se isso vier a existir, é
sistema separado, como no projeto original.

## Stack

- Next.js 16 (App Router, `src/`) + TypeScript + Tailwind CSS v4
- shadcn/ui sobre **Base UI** (não Radix) — componentes em `src/components/ui/`
- Supabase (banco + auth). **Projeto ainda não provisionado** — crie um
  projeto novo em [supabase.com](https://supabase.com) e siga o `README.md`
  (rodar `supabase/migrations/` em ordem, preencher `.env.local`)
- Recharts para o gráfico do dashboard; sonner para toasts

## Comandos

- `npm run dev` — dev server
- `npm run build` — build de produção (usar para verificar tipos)
- `npm run lint` — ESLint

## Arquitetura

- Auth: e-mail/senha do Supabase. `src/proxy.ts` (Next 16 usa `proxy.ts`, não
  `middleware.ts`) protege todas as rotas e redireciona para `/login`.
  **Usa `getClaims()`, nunca `getUser()`**: o proxy roda em toda navegação e
  `getUser()` custa um round-trip ao Auth (300–700ms *por navegação*).
  `getClaims()` verifica a assinatura localmente e é igualmente seguro;
  `getSession()` não serve — não verifica assinatura.
- `src/lib/auth.ts::getCurrentProfile()` é o ponto único de "quem sou eu".
  Tem auto-reparo: se o usuário existe no Auth mas não em `profiles`, cria o
  perfil no primeiro acesso (a policy de insert permite `id = auth.uid()`).
- Toda rota em `(app)/` tem `loading.tsx`. Sem essa fronteira de Suspense as
  rotas dinâmicas não têm o que prefetchar e a navegação trava esperando o
  servidor. Ao criar rota nova, criar o `loading.tsx` junto.
- Padrão de dados: `src/app/(app)/*/page.tsx` são Server Components que buscam
  e passam para componentes client em `src/components/<módulo>/`. Mutações
  rodam no browser via Supabase e chamam `router.refresh()` + toast.
- `tasks-view.tsx` mantém um **espelho local** das tarefas para o arrastar do
  kanban responder na hora. O ajuste quando o servidor devolve dados novos é
  feito **durante o render** (padrão "adjusting state on prop change"), não num
  `useEffect` — o lint `react-hooks/set-state-in-effect` barra o efeito.
- Ordem no kanban: coluna `ordem` (`double precision`), ordenada **DESC** —
  tarefa nova nasce com `extract(epoch from now())`, ou seja, no topo. Arrastar
  grava o **ponto médio** entre os vizinhos (`calcularOrdem`), então um arrasto
  reescreve uma linha só.
- **Exceção do prazo em tarefa concluída**: um prazo vencido de tarefa já feita
  não pode dizer "Atrasada 2 dias" nem liderar a ordenação. `labelPrazoTask`
  troca o rótulo por "Feita DD/MM" e `ordenarPorUrgencia` joga as concluídas
  para o fim. Mexeu em ordenação/rótulo de prazo, respeite isso.
- Server Actions em `src/app/(app)/equipe/actions.ts` usam a **service_role**
  (`src/lib/supabase/admin.ts`) para criar acesso, trocar senha e excluir
  usuário — a Admin API do Auth não existe para o cliente anon. Toda ação
  revalida `is_admin` **no servidor** antes de agir; nunca confiar na UI.
  `src/lib/supabase/admin.ts` só pode ser importado de código de servidor.

## Banco de dados

- Migrations em `supabase/migrations/`. **Não há CLI do Supabase configurada**:
  o SQL é aplicado pelo MCP do Supabase (`apply_migration`, configurado em
  `.mcp.json`) ou manualmente no SQL Editor do painel. Ao aplicar por MCP,
  versionar o mesmo SQL em `supabase/migrations/`.
- Quatro tabelas: `tasks` no centro, ligada a `profiles` por duas FKs
  (`responsavel_id`, `criado_por`, ambas `on delete set null` — tirar a pessoa
  preserva a tarefa), e `task_items` (checklist) + `task_events`
  (comentários **e** histórico na mesma linha do tempo), ambas
  `on delete cascade`.
- Como `responsavel` e `autor` apontam para a mesma tabela, o embed precisa
  desambiguar pela coluna — ver `TASK_SELECT` em `src/lib/tasks.ts`:
  `responsavel:profiles!responsavel_id (…), autor:profiles!criado_por (…)`.
- **Histórico é trigger, não UI** (`log_task_changes`). Mudança de status,
  responsável, prazo e prioridade vira linha em `task_events` no banco. Não
  duplicar isso no cliente. A policy de insert de `task_events` só aceita
  `tipo = 'comentario'` — o resto entra por SECURITY DEFINER.
- **Recorrência é trigger** (`gerar_proxima_ocorrencia`): concluir uma tarefa
  recorrente cria a próxima com o checklist copiado e zerado. A flag
  `proxima_gerada` impede duplicata se a tarefa for reaberta e reconcluída. O
  `update` que marca a flag reentra no trigger e sai na primeira guarda
  (`old.status = 'concluida'`) — é assim que não recursa infinito.
- `profiles.papel` (`admin` | `colaborador`) é a permissão. O **primeiro**
  perfil criado vira admin sozinho (`handle_new_user`), senão ninguém poderia
  promover ninguém.
- **`funcao` e `setor` são listas fechadas** (0006). A antiga coluna `cargo`
  (texto livre) virou `profiles.funcao` com check
  (`coordenacao` | `apoio` | `conselheiro`) — texto livre não filtra, cada um
  escreve diferente. Rótulos e ordem de exibição vivem em `src/lib/format.ts`
  (`FUNCAO_LABELS`/`FUNCAO_ORDER`, `SETOR_LABELS`/`SETOR_ORDER`).
- `tasks.setor` (0007) é **opcional e só organizacional**: agrupa/filtra por
  frente de trabalho, não muda permissão nem entra no histórico de
  `task_events`. A lista de setores está duplicada no check de `profiles.setor`
  e no de `tasks.setor` — setor novo entra nos dois **e** em `SETOR_ORDER`.
- RLS: todos os autenticados **leem** tudo (a organização precisa enxergar o
  quadro); escrita em `tasks` só para admin, responsável ou criador
  (`pode_editar_task`).

## PWA / celular

- Instalável via `src/app/manifest.ts` (o Next injeta o `<link rel="manifest">`
  e serve em `/manifest.webmanifest`). Ícones em `public/icon-*.png`, gerados do
  `src/app/icon.png` com sharp. O **maskable** tem o símbolo a 62% porque o
  Android recorta em círculo e o carro é largo.
- **`manifest.webmanifest`, `sw.js` e `offline.html` estão fora do matcher do
  `proxy.ts`** — e têm que continuar. O navegador busca o manifest **sem
  credenciais**; se o proxy redirecionar para `/login`, o manifest não é lido e
  o app deixa de ser instalável. Já aconteceu.
- O `favicon.ico` é PNG-em-ICO gerado por script. O Turbopack **decodifica** o
  `.ico` no build e recusa PNG sem canal alfa (`ensureAlpha()` é obrigatório).
- `public/sw.js` só guarda a tela de offline. **Não cachear tarefa, sessão nem
  checklist**: num sistema de delegação, "concluída" desatualizada é pior que
  erro de rede. Registrado por `src/components/service-worker.tsx`, só em
  produção (em dev o SW atrapalha o hot reload).
- **Arrastar não existe em tela de toque.** O HTML5 drag-and-drop do kanban só
  funciona com mouse, então todo card tem um menu `⋮` com "Mover para" — é o
  caminho real no celular, não um extra. Ao mexer no kanban, preservar isso.
- Áreas seguras: `viewport-fit=cover` + `env(safe-area-inset-*)` no header
  mobile e no `<main>`. Sem isso o conteúdo fica sob o notch e a barra inferior
  do iPhone no modo instalado. Altura em `dvh`, nunca `vh`.
- Zoom **não** é bloqueado (sem `user-scalable=no`) — é acessibilidade.
- No celular o calendário mostra pontos na grade e a lista do dia tocado abaixo:
  sete colunas a 390px dão ~50px, onde nenhum título cabe.

## Design / Marca

- Segue `DESIGN_SYSTEM.md` na raiz — ler antes de criar tela nova.
- Estilo Apple-like: fundo `#f5f5f7`, cards brancos com `ring-black/5` + sombra
  suave, raio base 0.75rem, muito respiro, títulos `tracking-tight`, peso máximo
  `font-semibold`, `tabular-nums` em todo número.
- Cores da marca em `globals.css`: `--brand-navy` (#242c39, charcoal-navy
  extraído da silhueta do escalador na logo) e `--brand-gold` (#d89531,
  dourado quente extraído do gradiente pôr do sol da logo). `--primary` e
  `--sidebar` usam o navy.
- A logo tem vermelho/amarelo vivos (identidade forte do escalada) mas **não
  viram cor de UI** — vermelho já é `--destructive` e inundar botões/fundo de
  cor quebraria o visual premium/minimalista. Eles aparecem só dentro da
  própria imagem da logo.
- Logo: `public/logo-escalada.jpg` (ilustração de bordo a bordo, sem fundo
  plano — por isso **não** tenta "colar" no fundo da sidebar como o logo
  antigo; entra como selo arredondado, `rounded-xl object-cover` num
  container pequeno ao lado do nome). Ícone do app: `src/app/icon.png`.
- Fonte Geist. No `@theme inline`, `--font-sans` **tem** que apontar para
  `var(--font-geist-sans)` — o `shadcn init` gera auto-referência circular que
  derruba a página inteira para serifa.
- Cores do gráfico: `--chart-criada` (cinza) e `--chart-concluida` (azul) —
  par validado para daltonismo. Não trocar por verde/vermelho: o trio
  emerald/red/amber já é o semáforo de estado (atrasada / hoje / concluída).

## Convenções

- Interface toda em pt-BR. Datas `date` do Postgres formatadas com `formatDate`
  (sem conversão de fuso — ver `src/lib/format.ts`); `timestamptz` (como
  `concluida_em`) **precisa** virar data local antes de formatar, senão uma
  conclusão à noite aparece no dia seguinte.
- Select/Dialog/Tabs do Base UI: `Select` recebe `items` + `onValueChange`
  (não `onChange`) e não aceita `""` como valor — usar sentinela
  (`__none__`); triggers de menu compõem via `render={<Button …/>}`, não
  `asChild`.
- Dialogs recebem `key={item?.id ?? "nova"}` para o estado do form resetar ao
  trocar de item.
