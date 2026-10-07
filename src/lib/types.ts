// Tipos do banco escritos à mão (espelham supabase/migrations/).

export type Papel = "admin" | "colaborador";
export type Funcao = "coordenacao" | "apoio" | "conselheiro";
export type Setor =
  | "coordenacao"
  | "secretaria"
  | "tesouraria"
  | "marketing"
  | "infraestrutura"
  | "decoracao"
  | "tios"
  | "entretenimento"
  | "bebidas"
  | "delivery";
export type TaskStatus = "a_fazer" | "em_andamento" | "concluida";
export type Prioridade = "baixa" | "media" | "alta" | "urgente";
export type Recorrencia = "diaria" | "semanal" | "quinzenal" | "mensal";
export type EventoTipo =
  | "comentario"
  | "criacao"
  | "status"
  | "responsavel"
  | "prazo"
  | "prioridade";

export type Profile = {
  id: string;
  nome: string;
  email: string | null;
  funcao: Funcao | null;
  papel: Papel;
  setor: Setor | null;
  foto_url: string | null;
  /** false = pessoa só registrada (função/setor/foto), sem login no sistema. */
  tem_acesso: boolean;
  ativo: boolean;
  created_at: string;
};

/** Resumo de perfil que vem embedado nas tarefas via PostgREST. */
export type ProfileRef = Pick<Profile, "id" | "nome" | "funcao" | "foto_url">;

export type TaskItem = {
  id: string;
  task_id: string;
  texto: string;
  concluido: boolean;
  ordem: number;
  created_at: string;
};

export type TaskEvent = {
  id: string;
  task_id: string;
  autor_id: string | null;
  tipo: EventoTipo;
  texto: string | null;
  de: string | null;
  para: string | null;
  created_at: string;
  autor?: ProfileRef | null;
};

export type Task = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TaskStatus;
  prioridade: Prioridade;
  /** Opcional — só para agrupar/filtrar por frente de trabalho. */
  setor: Setor | null;
  responsavel_id: string | null;
  criado_por: string | null;
  prazo: string | null;
  concluida_em: string | null;
  ordem: number;
  recorrencia: Recorrencia | null;
  recorrencia_origem_id: string | null;
  proxima_gerada: boolean;
  created_at: string;
  updated_at: string;
};

/** Tarefa com os embeds que a UI consome (ver TASK_SELECT em lib/tasks.ts). */
export type TaskWithRelations = Task & {
  responsavel: ProfileRef | null;
  autor: ProfileRef | null;
  task_items: Pick<TaskItem, "id" | "concluido">[];
};

// ── Programação do dia ──────────────────────────────────────────────────────

export type BlocoTipo =
  | "operacional"
  | "abertura"
  | "refeicao"
  | "apresentacao"
  | "dinamica"
  | "intervalo"
  | "encerramento";

export type BlocoEventoTipo =
  | "comentario"
  | "criacao"
  | "titulo"
  | "duracao"
  | "horario"
  | "responsavel"
  | "formato";

export type Bloco = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: BlocoTipo;
  /** Texto livre: banda, DJ e convidado de fora não têm perfil. */
  conduzido_por: string | null;
  local: string | null;
  responsavel_id: string | null;
  duracao_min: number;
  /** "HH:MM:SS" — âncora que não desliza com a cascata. */
  inicio_fixo: string | null;
  ordem: number;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type BlocoEvent = {
  id: string;
  bloco_id: string;
  autor_id: string | null;
  tipo: BlocoEventoTipo;
  texto: string | null;
  de: string | null;
  para: string | null;
  created_at: string;
  autor?: ProfileRef | null;
};

/** Bloco com os embeds que a UI consome (ver BLOCO_SELECT em lib/programacao.ts). */
export type BlocoWithRelations = Bloco & {
  responsavel: ProfileRef | null;
  /** Só os comentários (filtrados na query) — é a contagem do card. */
  bloco_events: Pick<BlocoEvent, "id">[];
};

// ── Materiais ───────────────────────────────────────────────────────────────

export type MaterialPasta = {
  id: string;
  nome: string;
  criado_por: string | null;
  created_at: string;
};

export type Material = {
  id: string;
  pasta_id: string | null;
  nome: string;
  caminho: string;
  /** Caminho do JPEG pequeno da grade. Null = formato que o navegador não lê. */
  miniatura: string | null;
  mime: string | null;
  tamanho: number;
  descricao: string | null;
  enviado_por: string | null;
  created_at: string;
};

/** Material com o autor embedado e as URLs públicas montadas no servidor. */
export type MaterialWithRelations = Material & {
  autor: ProfileRef | null;
  url: string;
  /** Mesma URL, mas força o download com o nome original. */
  urlDownload: string;
  urlMiniatura: string | null;
};
