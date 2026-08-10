# Sistema de Tarefas — Feijoada do Escalada

Delegação e acompanhamento de tarefas da organização da Feijoada do Escalada:
quadro kanban, lista, calendário, checklist, comentários e tarefas
recorrentes. Cada pessoa da equipe organizadora tem o próprio login.

Mesma stack e mesmo design system do Sistema de Tarefas AutoRio: Next.js 16 +
Supabase + shadcn/ui sobre Base UI — banco Supabase próprio, criado do zero
para este evento.

---

## Configurar o banco (primeira vez)

Este projeto ainda não tem um banco Supabase provisionado. Para rodar:

1. **Novo projeto** em [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: rode todos os arquivos de
   [`supabase/migrations/`](supabase/migrations) **em ordem numérica**
   (`0001_init.sql` → `0007_task_setor.sql`), um por vez. A ordem importa: as
   últimas alteram o que as primeiras criaram.
3. **`.env.local`** (copie de `.env.local.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) e,
   opcionalmente, `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Project Settings →
   API Keys.
4. **Authentication → Users → Add user**, com *Auto Confirm User* marcado.
   O primeiro usuário vira administrador sozinho.

```bash
npm install
npm run dev          # http://localhost:3000
```

A `SUPABASE_SERVICE_ROLE_KEY` é opcional: ela habilita criar acessos e trocar
senhas pela tela **Equipe**. Sem ela o resto funciona igual, mas as pessoas
precisam ser cadastradas pelo painel do Supabase (Authentication → Users →
Add user).

---

## Como funciona

### Permissões

| | Organizador(a) | Participante |
|---|---|---|
| Ver todas as tarefas | sim | sim |
| Criar tarefa | sim | sim |
| Editar/concluir | qualquer uma | as suas (responsável ou criador) |
| Excluir tarefa | qualquer uma | as que criou |
| Comentar | sim | sim |
| Gerenciar equipe | sim | não |

As regras valem no banco (RLS), não só na tela — não dá para burlar.

### Tarefas recorrentes

Escolha a repetição no campo **Repetição**. Quando a tarefa é concluída, o
próprio banco cria a próxima ocorrência já com o checklist copiado (e zerado) e
o mesmo responsável. Reabrir e reconcluir não duplica.

### Histórico

Mudanças de status, responsável, prazo e prioridade são gravadas
automaticamente por trigger. A aba **Atividade** da tarefa mostra isso junto com
os comentários, do mais recente para o mais antigo.

---

## Instalar no celular

O sistema é um PWA: instala na tela de início e abre sem barra de endereço,
como um aplicativo.

- **Android (Chrome):** abra o site → menu ⋮ → *Instalar aplicativo*.
- **iPhone (Safari):** abra o site → botão de compartilhar → *Adicionar à Tela
  de Início*. **Tem que ser no Safari** — no Chrome do iPhone a opção não existe.

Requisito: o site precisa estar em **HTTPS** (na Vercel já vem). Em
`http://localhost` funciona para teste; em HTTP num IP da rede local, não.

Sem internet o app abre uma tela de "sem conexão" em vez do erro do navegador.
Ele **não** funciona offline de propósito: mostrar um quadro de tarefas
desatualizado ("isso já foi feito?") é pior do que dizer que falta rede.

## Comandos

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção (também confere os tipos)
npm run lint
```

## Publicar

Na [Vercel](https://vercel.com/new): **Add New → Project → Import** este
repositório do GitHub. O framework é detectado sozinho (Next.js), então só
falta colar as variáveis do passo 3 em **Environment Variables**, antes do
primeiro deploy:

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem (chave *publishable*) |
| `SUPABASE_SERVICE_ROLE_KEY` | idem (*service role*) — opcional, só para a tela Equipe |

Marque as três para **Production, Preview e Development**. Variável adicionada
depois do deploy só vale no próximo — é preciso **Redeploy**.

O banco é o mesmo do desenvolvimento: as migrations rodam no painel do
Supabase, não pela Vercel. Depois do primeiro deploy, cada `git push` na `main`
publica sozinho.
