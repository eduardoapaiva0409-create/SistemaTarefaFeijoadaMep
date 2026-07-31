# Sistema de Tarefas — AutoRio

Delegação e acompanhamento de tarefas da oficina: quadro kanban, lista,
calendário, checklist, comentários e tarefas recorrentes. Cada pessoa da equipe
tem o próprio login.

Mesma stack e mesmo design system do Sistema Financeiro AutoRio: Next.js 16 +
Supabase + shadcn/ui sobre Base UI.

---

## Estado atual

O banco **já está configurado** no projeto Supabase `Tarefas AR`
(`doejvfajvgzipgzfoocq`): migrations aplicadas, RLS ativa, triggers no lugar e o
primeiro administrador criado. Para rodar:

```bash
npm install
npm run dev          # http://localhost:3000
```

Falta apenas uma coisa opcional no `.env.local`: a **`SUPABASE_SERVICE_ROLE_KEY`**
(Supabase → Project Settings → API Keys → `service_role`). Ela habilita criar
acessos e trocar senhas pela tela **Equipe**. Sem ela o resto funciona igual,
mas as pessoas precisam ser cadastradas pelo painel do Supabase
(Authentication → Users → Add user).

<details>
<summary>Se algum dia precisar recriar o banco do zero</summary>

1. **Novo projeto** em [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: rode
   [`0001_init.sql`](supabase/migrations/0001_init.sql) e depois
   [`0002_hardening.sql`](supabase/migrations/0002_hardening.sql), nessa ordem.
3. **`.env.local`**: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) e `SUPABASE_SERVICE_ROLE_KEY`.
4. **Authentication → Users → Add user**, com *Auto Confirm User* marcado.
   O primeiro usuário vira administrador sozinho.

</details>

---

## Como funciona

### Permissões

| | Administrador | Colaborador |
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

Vercel → importar o repositório → colar as três variáveis de ambiente do passo 3
em **Environment Variables**. Nada mais.
