# Sistema de Tarefas — Feijoada do Escalada

Organização da Feijoada do Escalada (29/11/2026): delegação e acompanhamento
de tarefas (quadro kanban, lista, calendário, checklist, comentários e tarefas
recorrentes), a programação do dia e a pasta de materiais do marketing. Cada
pessoa da equipe organizadora tem o próprio login.

Mesma stack e mesmo design system do Sistema de Tarefas AutoRio: Next.js 16 +
Supabase + shadcn/ui sobre Base UI — banco Supabase próprio, criado do zero
para este evento.

---

## Configurar o banco (primeira vez)

Este projeto ainda não tem um banco Supabase provisionado. Para rodar:

1. **Novo projeto** em [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: rode todos os arquivos de
   [`supabase/migrations/`](supabase/migrations) **em ordem numérica**
   (`0001_init.sql` → `0009_materiais.sql`), um por vez. A ordem importa: as
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

### Programação

O cronograma do dia como uma fila de blocos (montagem, abertura, feijoada,
banda, sorteio…). Cada bloco tem uma **duração**, e o horário é calculado: um
bloco começa quando o anterior termina. Esticar a banda em 15 min empurra o
resto do dia sozinho. O que tem **hora marcada** (a feijoada sair às 12:00, a
saída do espaço) vira âncora e não desliza. Se o que vem antes passa da hora,
a tela avisa o conflito.

Arraste os blocos no computador; no celular, use o menu ⋮ (Subir/Descer,
±5 min). O botão **Copiar** gera a programação em texto para colar no grupo.
Qualquer pessoa da organização edita; remover um bloco é do admin ou de quem
criou.

### Materiais

Pasta compartilhada para o marketing subir vídeos, imagens, artes e PDFs:
arraste os arquivos para a tela ou use **Enviar arquivos** (no celular, abre a
galeria). Dá para organizar em pastas, buscar, filtrar por tipo, baixar com o
nome original e copiar o link. **O link abre sem login**, então dá para mandar
no WhatsApp. Excluir um arquivo é de quem enviou ou do admin.

**Limite de tamanho:** no plano Free do Supabase o máximo é **50 MB por
arquivo** e **1 GB de armazenamento** no total. Vídeo maior que isso precisa do
plano Pro (Storage → Settings → *Global file size limit*, até 500 GB).

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
